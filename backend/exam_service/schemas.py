from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Union
from datetime import datetime
from uuid import UUID

class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    duration_minutes: int
    passing_score: int = 0
    max_attempts: int = 1
    shuffle_questions: bool = True
    shuffle_options: bool = True
    show_result_after_submit: bool = True
    show_answers_after_submit: bool = True
    is_public: bool = True
    enable_proctoring: bool = True
    access_password: Optional[str] = None

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    passing_score: Optional[int] = None
    max_attempts: Optional[int] = None
    shuffle_questions: Optional[bool] = None
    shuffle_options: Optional[bool] = None
    show_result_after_submit: Optional[bool] = None
    show_answers_after_submit: Optional[bool] = None
    status: Optional[str] = None
    is_public: Optional[bool] = None
    enable_proctoring: Optional[bool] = None
    access_password: Optional[str] = None

class ExamResponse(ExamBase):
    id: UUID
    status: str
    owner_id: UUID
    has_password: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ExamStartRequest(BaseModel):
    password: Optional[str] = None

class ExamQuestionBase(BaseModel):
    question_id: str
    question_order: Optional[int] = None
    point_value: float = 1.0

class ExamQuestionCreate(ExamQuestionBase):
    pass

class ExamQuestionUpdate(BaseModel):
    question_order: Optional[int] = None
    point_value: Optional[float] = None

class ExamQuestionResponse(ExamQuestionBase):
    id: UUID
    exam_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ExamQuestionDetail(BaseModel):
    """Trả về đầy đủ nội dung câu hỏi thật (lấy từ question_service) để hiển thị lúc thi/quản lý —
    khác với ExamQuestionResponse (chỉ có question_id tham chiếu, không có nội dung).
    correct_answer chỉ được trả về cho admin/teacher, luôn None với học sinh để tránh lộ đáp án."""
    id: str
    question_id: str
    question_order: Optional[int] = None
    point_value: float = 1.0
    type: str = "multiple_choice"
    content: dict = {}
    options: list = []
    correct_answer: Optional[Union[str, list]] = None

class ExamScheduleBase(BaseModel):
    start_time: datetime
    end_time: datetime
    timezone: str = "UTC"

class ExamScheduleCreate(ExamScheduleBase):
    pass

class ExamScheduleResponse(ExamScheduleBase):
    id: UUID
    exam_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

from typing import Literal

class ExamCollaboratorCreate(BaseModel):
    user_id: UUID
    role: Literal["CO_TEACHER"] = "CO_TEACHER"

class ExamProctorCreate(BaseModel):
    user_id: UUID

class ExamRosterCreate(BaseModel):
    user_id: UUID

class GenerateExamRequest(BaseModel):
    subject: str
    difficulty: str
    num_questions: int = Field(gt=0)
    question_types: List[str]
    point_per_question: float = 1.0

class ExamAttemptBase(BaseModel):
    pass

class ExamAttemptCreate(ExamAttemptBase):
    pass

class ExamAttemptResponse(ExamAttemptBase):
    id: UUID
    exam_id: UUID
    user_id: str
    attempt_number: int
    status: str
    started_at: datetime
    expires_at: datetime
    submitted_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ExamAttemptAnswerCreate(BaseModel):
    question_id: str
    selected_answer: str

class ExamAttemptAnswerResponse(BaseModel):
    id: UUID
    attempt_id: UUID
    question_id: str
    selected_answer: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
