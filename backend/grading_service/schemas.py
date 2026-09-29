from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime
from uuid import UUID

class SubmissionCreate(BaseModel):
    attempt_id: UUID
    exam_id: UUID
    user_id: UUID | str
    answers: Dict[str, str]

class QuestionResultSchema(BaseModel):
    question_id: str
    user_answer: Optional[str]
    is_correct: bool
    point_earned: float
    point_possible: float
    needs_manual_grading: bool = False

class GradingResult(BaseModel):
    score: float
    total_possible: float
    percentage: float
    correct_count: int
    incorrect_count: int
    question_results: List[QuestionResultSchema]

class ResultResponse(BaseModel):
    id: UUID
    exam_id: UUID
    user_id: UUID | str
    score: Optional[float]
    total_possible: Optional[float]
    percentage: Optional[float]
    correct_count: Optional[int]
    incorrect_count: Optional[int]
    time_taken: Optional[int]
    status: str
    has_pending_manual_grading: bool = False
    started_at: Optional[datetime]
    submitted_at: Optional[datetime]
    created_at: datetime
    question_results: List[QuestionResultSchema] = []
    
    class Config:
        from_attributes = True

class SubmissionResponse(BaseModel):
    submission_id: str
    status: str
    message: str

class ManualGradeRequest(BaseModel):
    point_earned: float = Field(ge=0)
    note: Optional[str] = None

class PendingManualGradeItem(BaseModel):
    result_id: UUID
    attempt_id: UUID
    exam_id: UUID
    user_id: UUID | str
    question_id: str
    user_answer: Optional[str]
    point_possible: float

    class Config:
        from_attributes = True
