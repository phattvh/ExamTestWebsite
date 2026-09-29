import httpx
import json
import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone

from models import Violation
from config import settings
from services.redis_client import redis_client

logger = logging.getLogger(__name__)

SEVERITY_WEIGHTS = {
    "critical": 10,
    "high": 5,
    "medium": 2,
    "low": 1
}

RISK_THRESHOLD = 30
REDIS_TTL_SECONDS = 600

async def _get_redis_key(exam_id: UUID, user_id: str) -> str:
    return f"risk:{exam_id}:{user_id}"

async def _load_risk_state(key: str):
    client = await redis_client.get_client()
    value = await client.get(key)
    if not value:
        return {
            "score": 0,
            "last_violation": None,
            "violations": []
        }
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return {
            "score": 0,
            "last_violation": None,
            "violations": []
        }

async def _save_risk_state(key: str, state: dict):
    client = await redis_client.get_client()
    await client.set(key, json.dumps(state), ex=REDIS_TTL_SECONDS)

async def calculate_risk_and_alert(
    db: AsyncSession,
    exam_id: UUID,
    user_id: str,
    current_violation_id: UUID,
    current_severity: str,
    violation_type: str = "violation",
    details: dict = None
) -> int:
    redis_key = await _get_redis_key(exam_id, user_id)
    state = await _load_risk_state(redis_key)

    current_score = state.get("score", 0)
    violations = state.get("violations", [])

    weight = SEVERITY_WEIGHTS.get(current_severity, 0)
    current_score += weight
    violations.append(str(current_violation_id))
    now_iso = datetime.now(timezone.utc).isoformat()

    state = {
        "score": current_score,
        "last_violation": now_iso,
        "violations": violations
    }

    await _save_risk_state(redis_key, state)

    # Luôn gửi thông báo vi phạm sang realtime_service để giám thị thấy ngay lập tức
    await send_violation_broadcast(
        exam_id=exam_id,
        user_id=user_id,
        violation_id=current_violation_id,
        severity=current_severity,
        violation_type=violation_type,
        risk_score=current_score,
        timestamp=now_iso,
        details=details
    )

    return current_score

async def send_violation_broadcast(
    exam_id: UUID,
    user_id: str,
    violation_id: UUID,
    severity: str,
    violation_type: str,
    risk_score: int,
    timestamp: str,
    details: dict = None
):
    payload = {
        "exam_id": str(exam_id),
        "user_id": user_id,
        "severity": severity,
        "message": f"Phát hiện vi phạm: {violation_type}",
        "violation_id": str(violation_id),
        "type": violation_type,
        "risk_score": risk_score,
        "timestamp": timestamp,
        "details": details or {}
    }

    try:
        async with httpx.AsyncClient() as client:
            url = f"{settings.REALTIME_SERVICE_URL}/api/v1/realtime/alert"
            await client.post(url, json=payload, headers={"X-Internal-Token": settings.JWT_SECRET}, timeout=5.0)
    except Exception as e:
        logger.error(f"Failed to send alert to realtime service: {e}")
