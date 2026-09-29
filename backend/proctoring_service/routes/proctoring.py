from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, text
from typing import List, Optional
from uuid import UUID

from database import get_db
from dependencies import get_current_user, require_permission
from models import Violation
from schemas import ViolationCreate, ViolationResponse, EventLogResponse, RiskResponse, ResetRequest
from services.risk_engine import calculate_risk_and_alert

router = APIRouter(tags=["Proctoring"])

async def verify_proctor_access(exam_id: UUID | str, current_user: dict, db: AsyncSession):
    if current_user["role"] == "admin":
        return
    if current_user["role"] == "student":
        return
        
    res = await db.execute(
        text("""
            SELECT 1 FROM exams WHERE id = :exam_id AND owner_id = :user_id::uuid
            UNION
            SELECT 1 FROM exam_collaborators WHERE exam_id = :exam_id AND user_id = :user_id::uuid
            UNION
            SELECT 1 FROM exam_proctors WHERE exam_id = :exam_id AND user_id = :user_id::uuid
        """),
        {"exam_id": str(exam_id), "user_id": current_user["id"]}
    )
    if not res.fetchone():
        raise HTTPException(status_code=403, detail="Not authorized to proctor this exam")

@router.post("/events", response_model=EventLogResponse)
async def log_event(
    event: ViolationCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verify_proctor_access(event.exam_id, current_user, db)
    
    violation = Violation(
        exam_id=event.exam_id,
        exam_session_id=event.exam_session_id,
        user_id=current_user["id"],
        type=event.type,
        severity=event.severity,
        details=event.details,
        screenshot_url=event.screenshot_url,
        device_info=event.device_info
    )
    
    db.add(violation)
    await db.flush()
    
    current_risk_score = await calculate_risk_and_alert(
        db, 
        event.exam_id, 
        current_user["id"], 
        violation.id,
        violation.severity,
        violation.type,
        violation.details
    )
    
    violation.risk_score_at_event = current_risk_score
    await db.commit()
    await db.refresh(violation)
    
    return {"violation": violation, "current_risk_score": current_risk_score}

@router.get("/exams/{exam_id}/violations", response_model=List[ViolationResponse])
async def list_violations(
    exam_id: UUID,
    user_id: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_permission("proctoring:read")),
    db: AsyncSession = Depends(get_db)
):
    await verify_proctor_access(exam_id, current_user, db)
            
    query = select(Violation).where(Violation.exam_id == exam_id)
    
    if user_id:
        query = query.where(Violation.user_id == user_id)
    if severity:
        query = query.where(Violation.severity == severity)
        
    query = query.order_by(desc(Violation.timestamp)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    violations = result.scalars().all()
    return violations

@router.get("/risk/{exam_id}/{user_id}", response_model=RiskResponse)
async def get_risk_score(
    exam_id: UUID,
    user_id: str,
    current_user: dict = Depends(require_permission("proctoring:read")),
    db: AsyncSession = Depends(get_db)
):
    await verify_proctor_access(exam_id, current_user, db)
            
    from datetime import datetime, timedelta, timezone
    five_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
    
    query = select(Violation).where(
        Violation.exam_id == exam_id,
        Violation.user_id == user_id,
        Violation.timestamp >= five_mins_ago
    ).order_by(desc(Violation.timestamp))
    
    result = await db.execute(query)
    violations = result.scalars().all()
    
    score = 0
    weights = {"critical": 10, "high": 5, "medium": 2, "low": 1}
    for v in violations:
        score += weights.get(v.severity, 0)
        
    last_violation_at = violations[0].timestamp if violations else None
    
    return {
        "risk_score": score,
        "violation_count": len(violations),
        "last_violation_at": last_violation_at
    }

@router.post("/reset")
async def reset_risk_score(
    request: ResetRequest,
    current_user: dict = Depends(require_permission("proctoring:read")),
    db: AsyncSession = Depends(get_db)
):
    await verify_proctor_access(request.exam_id, current_user, db)
    return {"status": "reset"}

@router.get("/violations/sessions")
async def get_violation_sessions(
    current_user: dict = Depends(require_permission("proctoring:read")),
    db: AsyncSession = Depends(get_db)
):
    """
    Danh sách các bài thi có hình ảnh/nhật ký vi phạm, nhóm theo bài thi và thời gian.
    """
    sql = """
        SELECT 
            v.exam_id::text as exam_id,
            COALESCE(e.title, 'Đề thi không xác định') as exam_title,
            COALESCE(e.duration_minutes, 0) as duration_minutes,
            MIN(v.timestamp) as first_violation_at,
            MAX(v.timestamp) as last_violation_at,
            COUNT(v.id) as total_violations,
            COUNT(DISTINCT v.user_id) as total_students,
            COUNT(CASE WHEN v.screenshot_url IS NOT NULL AND v.screenshot_url != '' THEN 1 END) as total_screenshots
        FROM violations v
        LEFT JOIN exams e ON v.exam_id = e.id
        GROUP BY v.exam_id, e.title, e.duration_minutes
        ORDER BY MAX(v.timestamp) DESC
    """
    result = await db.execute(text(sql))
    rows = result.mappings().all()
    return [dict(r) for r in rows]

@router.get("/violations/sessions/{exam_id}")
async def get_violation_session_details(
    exam_id: str,
    current_user: dict = Depends(require_permission("proctoring:read")),
    db: AsyncSession = Depends(get_db)
):
    """
    Chi tiết các vi phạm và hình ảnh bằng chứng gian lận của 1 bài thi cụ thể.
    """
    sql = """
        SELECT 
            v.id::text as id,
            v.exam_id::text as exam_id,
            COALESCE(e.title, 'Đề thi không xác định') as exam_title,
            v.user_id,
            COALESCE(u.username, v.user_id) as username,
            COALESCE(u.full_name, u.username, v.user_id) as full_name,
            v.type,
            v.severity,
            v.timestamp,
            v.details,
            v.screenshot_url,
            v.device_info,
            v.risk_score_at_event
        FROM violations v
        LEFT JOIN exams e ON v.exam_id = e.id
        LEFT JOIN users u ON v.user_id = u.id::text OR v.user_id = u.username
        WHERE v.exam_id = CAST(:exam_id AS uuid)
        ORDER BY v.timestamp DESC
    """
    result = await db.execute(text(sql), {"exam_id": exam_id})
    rows = result.mappings().all()
    return [dict(r) for r in rows]

@router.delete("/violations/{violation_id}")
async def delete_violation(
    violation_id: str,
    current_user: dict = Depends(require_permission("proctoring:read")),
    db: AsyncSession = Depends(get_db)
):
    """
    Xóa 1 bản ghi vi phạm / hình ảnh vi phạm cụ thể.
    """
    if current_user["role"] not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Chỉ Quản trị viên và Giáo viên mới có quyền xoá bằng chứng vi phạm.")
    
    res = await db.execute(
        text("DELETE FROM violations WHERE id = CAST(:vid AS uuid) RETURNING id"),
        {"vid": violation_id}
    )
    deleted = res.fetchone()
    await db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Bản ghi vi phạm không tồn tại.")
    return {"status": "deleted", "id": violation_id}

@router.delete("/violations/sessions/{exam_id}")
async def delete_violation_session(
    exam_id: str,
    current_user: dict = Depends(require_permission("proctoring:read")),
    db: AsyncSession = Depends(get_db)
):
    """
    Xóa toàn bộ thư mục/dữ liệu vi phạm của cả bài thi.
    """
    if current_user["role"] not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Chỉ Quản trị viên và Giáo viên mới có quyền xoá toàn bộ mục vi phạm bài thi.")
        
    await db.execute(
        text("DELETE FROM violations WHERE exam_id = CAST(:eid AS uuid)"),
        {"eid": exam_id}
    )
    await db.commit()
    return {"status": "session_deleted", "exam_id": exam_id}

