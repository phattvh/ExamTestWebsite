from typing import List, Optional, Union
from pydantic import BaseModel, Field
from utils.validators import PyObjectId
from models import QuestionContent, Option, QuestionMetadata, CategoryModel, QuestionModel

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryResponse(CategoryModel):
    pass

class QuestionCreate(BaseModel):
    content: QuestionContent
    type: str
    options: List[Option] = []
    correct_answer: Union[str, List[str]]
    explanation: Optional[str] = None
    metadata: QuestionMetadata
    category_id: Optional[str] = None

class QuestionUpdate(BaseModel):
    content: Optional[QuestionContent] = None
    type: Optional[str] = None
    options: Optional[List[Option]] = None
    correct_answer: Optional[Union[str, List[str]]] = None
    explanation: Optional[str] = None
    metadata: Optional[QuestionMetadata] = None
    is_active: Optional[bool] = None
    category_id: Optional[str] = None

class QuestionResponse(QuestionModel):
    pass

class PaginatedQuestionResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[QuestionResponse]

class PaginatedCategoryResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[CategoryResponse]

class ExamQuestionSnapshotCreate(BaseModel):
    exam_id: str
    question_id: str
    question_version: int = 1
    question_text: str
    type: str = "multiple_choice"
    choices: list = []
    correct_answer: Union[str, list]
    points: float = 1.0
    display_order: int = 0

class ExamQuestionSnapshotResponse(BaseModel):
    id: str
    exam_id: str
    question_id: str
    question_version: int
    question_text: str
    type: str = "multiple_choice"
    choices: list
    correct_answer: Union[str, list]
    points: float
    display_order: int
    created_at: str

    @classmethod
    def from_mongo(cls, data: dict):
        if not data:
            return None
        return cls(
            id=str(data.get("_id", data.get("id"))),
            exam_id=data.get("exam_id"),
            question_id=data.get("question_id"),
            question_version=data.get("question_version", 1),
            type=data.get("type", "multiple_choice"),
            question_text=data.get("question_text", ""),
            choices=data.get("choices", []),
            correct_answer=data.get("correct_answer", ""),
            points=data.get("points", 1.0),
            display_order=data.get("display_order", 0),
            created_at=str(data.get("created_at", ""))
        )
