from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime

class QuestionAnswer(BaseModel):
    question_index: int
    answer: str
    submitted_at: datetime

class ExamSession(BaseModel):
    session_id: str
    exam_id: str
    user_id: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    current_question: int = 0
    answers: Dict[str, str] = Field(default_factory=dict) # Redis stores dictionary keys as strings, so we use string index -> answer
    status: str = "in_progress" # "not_started", "in_progress", "submitted", "finished"
    total_questions: int = 0
    questions: List[dict] = Field(default_factory=list)
    last_heartbeat: datetime

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "exam_id": self.exam_id,
            "user_id": self.user_id,
            "started_at": self.started_at.isoformat(),
            "status": self.status,
            "total_questions": self.total_questions,
            "current_question": self.current_question
        }
