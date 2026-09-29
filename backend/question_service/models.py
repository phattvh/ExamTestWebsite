from typing import List, Optional, Union
from pydantic import BaseModel, Field
from datetime import datetime
from utils.validators import PyObjectId

class QuestionContent(BaseModel):
    text: str
    image: Optional[str] = None
    video: Optional[str] = None
    audio: Optional[str] = None
    latex: Optional[str] = None

class Option(BaseModel):
    id: str
    text: str
    is_correct: bool

class QuestionMetadata(BaseModel):
    difficulty: str  # "easy", "medium", "hard"
    subject: str
    chapter: Optional[str] = None
    tags: List[str] = []

class CategoryModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class QuestionModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    content: QuestionContent
    type: str  # "multiple_choice", "true_false", "essay", etc.
    options: List[Option] = []
    correct_answer: Union[str, List[str]]
    explanation: Optional[str] = None
    metadata: QuestionMetadata
    created_by: str  # User ID or Username
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    usage_count: int = 0
    category_id: Optional[PyObjectId] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class ExamQuestionSnapshot(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    exam_id: str
    question_id: str
    question_version: int = 1
    question_text: str
    type: str = "multiple_choice"
    choices: list = []
    correct_answer: Union[str, list]
    points: float = 1.0
    display_order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}
