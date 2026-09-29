import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, JSON, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from database import Base

class Violation(Base):
    __tablename__ = "violations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    exam_session_id = Column(UUID(as_uuid=True), nullable=True)
    user_id = Column(String(50), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=func.now(), index=True)
    details = Column(JSONB, nullable=True)
    screenshot_url = Column(Text, nullable=True)
    device_info = Column(JSONB, nullable=True)
    risk_score_at_event = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
