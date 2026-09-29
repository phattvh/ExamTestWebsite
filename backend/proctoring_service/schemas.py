from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class ViolationCreate(BaseModel):
    exam_id: UUID
    exam_session_id: Optional[UUID] = None
    type: str
    severity: str
    details: Optional[Dict[str, Any]] = None
    screenshot_url: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None

class ViolationResponse(BaseModel):
    id: UUID
    exam_id: UUID
    exam_session_id: Optional[UUID]
    user_id: str
    type: str
    severity: str
    timestamp: datetime
    details: Optional[Dict[str, Any]]
    screenshot_url: Optional[str]
    device_info: Optional[Dict[str, Any]]
    risk_score_at_event: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class EventLogResponse(BaseModel):
    violation: ViolationResponse
    current_risk_score: int

class RiskResponse(BaseModel):
    risk_score: int
    violation_count: int
    last_violation_at: Optional[datetime]

class ResetRequest(BaseModel):
    exam_id: UUID
    user_id: str
