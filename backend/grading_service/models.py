import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Result(Base):
    __tablename__ = "results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id = Column(UUID(as_uuid=True), nullable=False, unique=True)
    exam_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    score = Column(Float, nullable=True)
    total_possible = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    correct_count = Column(Integer, nullable=True)
    incorrect_count = Column(Integer, nullable=True)
    time_taken = Column(Integer, nullable=True) # in seconds
    started_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="pending") # pending, grading, graded, failed
    has_pending_manual_grading = Column(Boolean, default=False, nullable=False, server_default="false")
    grading_started_at = Column(DateTime(timezone=True), nullable=True)
    grading_completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    question_results = relationship("QuestionResult", back_populates="result", cascade="all, delete")

    __table_args__ = (
        Index('idx_results_exam_user', 'exam_id', 'user_id'),
        Index('idx_results_attempt', 'attempt_id'),
        Index('idx_results_status', 'status'),
    )

class QuestionResult(Base):
    __tablename__ = "question_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    result_id = Column(UUID(as_uuid=True), ForeignKey("results.id", ondelete="CASCADE"))
    question_id = Column(String(64), nullable=False) # MongoDB ObjectId string
    question_index = Column(Integer, nullable=True)
    user_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    point_earned = Column(Float, default=0.0)
    point_possible = Column(Float, default=1.0)
    needs_manual_grading = Column(Boolean, default=False, nullable=False, server_default="false")
    graded_by_user_id = Column(String(50), nullable=True)
    manual_grading_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    result = relationship("Result", back_populates="question_results")
    
    __table_args__ = (
        Index('idx_question_results_result', 'result_id'),
        Index('idx_question_results_question', 'question_id'),
    )

class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id = Column(UUID(as_uuid=True), nullable=False, unique=True)
    exam_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    answers = Column(JSONB, nullable=False) # e.g. {"0": "A"}
    metadata_info = Column(JSONB, nullable=True) # "metadata" is reserved word in SQLAlchemy
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    processed = Column(Boolean, default=False)
    
    __table_args__ = (
        Index('idx_submissions_exam_user', 'exam_id', 'user_id'),
        Index('idx_submissions_attempt', 'attempt_id'),
    )
