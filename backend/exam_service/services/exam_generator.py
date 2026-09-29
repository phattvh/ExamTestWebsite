import random
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
import crud, schemas
from services.question_client import fetch_questions

async def generate_exam_from_bank(
    db: AsyncSession,
    exam_id: str,
    request: schemas.GenerateExamRequest,
    token: str
):
    filters = {
        "subject": request.subject,
        "difficulty": request.difficulty,
        # Lọc theo question_types (có thể nhiều loại) diễn ra ở phía client SAU khi fetch,
        # vì question_service chỉ hỗ trợ lọc theo 1 "type" duy nhất trên URL. limit đặt
        # khá cao để tránh báo sai "không đủ câu hỏi" khi ngân hàng câu hỏi lớn nhưng các
        # câu đúng loại cần tìm lại nằm ngoài phạm vi fetch nếu limit quá thấp.
        "limit": 500
    }
    
    response_data = await fetch_questions(filters, token)
    
    if isinstance(response_data, dict):
        if "items" in response_data:
            questions = response_data["items"]
        elif "data" in response_data:
            questions = response_data["data"]
        else:
            questions = []
    elif isinstance(response_data, list):
        questions = response_data
    elif len(response_data) == 2 and isinstance(response_data[1], list):
        questions = response_data[1]
    else:
        questions = []
        
    if request.question_types:
        questions = [q for q in questions if q.get("type") in request.question_types]
        
    if len(questions) < request.num_questions:
        raise HTTPException(status_code=400, detail="Not enough questions in bank")
        
    selected = random.sample(questions, request.num_questions)
    
    created_questions = []
    for idx, q in enumerate(selected):
        qid = q.get("id") or q.get("_id")
        exam_question_data = schemas.ExamQuestionCreate(
            question_id=str(qid),
            question_order=idx,
            point_value=request.point_per_question
        )
        created = await crud.add_exam_question(db, exam_id, exam_question_data)
        created_questions.append(created)
        
    return created_questions
