from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
import crud
import schemas
from dependencies import get_current_user, require_permission, require_internal_or_permission
import os
from services.cache import CacheService

redis_url = os.getenv("REDIS_URL", "redis://redis_cache:6379")
cache = CacheService(redis_url)

router = APIRouter()

@router.get("/", response_model=schemas.PaginatedQuestionResponse)
async def get_questions(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=500),
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    type: Optional[str] = None,
    category_id: Optional[str] = None,
    # LỖ HỔNG NGHIÊM TRỌNG ĐÃ SỬA: endpoint này trước đây hoàn toàn không yêu cầu xác
    # thực — bất kỳ ai (kể cả không đăng nhập) gọi thẳng API là xem được toàn bộ ngân
    # hàng câu hỏi kèm đáp án đúng (correct_answer, options[].is_correct), phá vỡ hoàn
    # toàn tính bảo mật của kỳ thi. Giờ bắt buộc phải có quyền question:read (chỉ
    # admin/teacher — học sinh xem câu hỏi lúc thi qua endpoint riêng của exam_service,
    # nơi đã tự ẩn đáp án đúng trước khi trả về).
    current_user: dict = Depends(require_permission("question:read"))
):
    filters = {
        "subject": subject,
        "difficulty": difficulty,
        "type": type,
        "category_id": category_id
    }
    
    async def fetch_data():
        total, items = await crud.get_questions(skip=skip, limit=limit, filters=filters)
        return {"total": total, "page": skip // limit + 1 if limit > 0 else 1, "size": limit, "items": items}

    # Creating a unique key based on the parameters
    key = f"questions:list:{skip}:{limit}:{subject}:{difficulty}:{type}:{category_id}"
    return await cache.get_or_set(key, fetch_data, ttl=300)

@router.post("/", response_model=schemas.QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    question: schemas.QuestionCreate,
    current_user: dict = Depends(require_permission("question:create"))
):
    question_data = question.model_dump(exclude_unset=True)
    question_data["created_by"] = current_user.get("id")
    new_q = await crud.create_question(question_data)
    if not new_q:
        raise HTTPException(status_code=400, detail="Failed to create question")
    await cache.invalidate_pattern("questions:list:*")
    return new_q

from typing import List
@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def create_questions_bulk(
    questions: List[schemas.QuestionCreate],
    current_user: dict = Depends(require_permission("question:create"))
):
    questions_data = []
    for q in questions:
        q_data = q.model_dump(exclude_unset=True)
        q_data["created_by"] = current_user.get("id")
        questions_data.append(q_data)
    if not questions_data:
        return {"inserted": 0}
    inserted_count = await crud.create_questions_bulk(questions_data)
    await cache.invalidate_pattern("questions:list:*")
    return {"inserted": inserted_count}

@router.get("/{id}", response_model=schemas.QuestionResponse)
async def get_question(
    id: str,
    current_user: dict = Depends(require_internal_or_permission("question:read"))
):
    q = await crud.get_question(id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q

@router.put("/{id}", response_model=schemas.QuestionResponse)
async def update_question(
    id: str,
    question: schemas.QuestionUpdate,
    current_user: dict = Depends(require_permission("question:update"))
):
    existing_q = await crud.get_question(id)
    if not existing_q:
        raise HTTPException(status_code=404, detail="Question not found")
        
    if current_user["role"] not in ("admin", "teacher") and existing_q.get("created_by") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    update_data = question.model_dump(exclude_unset=True)
    update_data.pop("created_by", None) # Prevent transferring ownership
    q = await crud.update_question(id, update_data)
    if not q:
        raise HTTPException(status_code=404, detail="Update failed")
    await cache.invalidate_pattern("questions:list:*")
    await cache.invalidate(f"question:{id}")
    return q

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    id: str,
    current_user: dict = Depends(require_permission("question:delete"))
):
    existing_q = await crud.get_question(id)
    if not existing_q:
        raise HTTPException(status_code=404, detail="Question not found")
        
    if current_user["role"] not in ("admin", "teacher") and existing_q.get("created_by") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    success = await crud.delete_question(id)
    if not success:
        raise HTTPException(status_code=404, detail="Delete failed")
    await cache.invalidate_pattern("questions:list:*")
    await cache.invalidate(f"question:{id}")
    return None

class BulkDeleteRequest(schemas.BaseModel):
    ids: List[str]

class BulkAssignCategoryRequest(schemas.BaseModel):
    question_ids: List[str]
    category_id: Optional[str] = None

@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
async def bulk_delete_questions(
    req: BulkDeleteRequest,
    current_user: dict = Depends(require_permission("question:delete"))
):
    deleted_count = await crud.bulk_delete_questions(req.ids)
    await cache.invalidate_pattern("questions:list:*")
    return {"deleted_count": deleted_count}

@router.post("/bulk-assign-category", status_code=status.HTTP_200_OK)
async def bulk_assign_category(
    req: BulkAssignCategoryRequest,
    current_user: dict = Depends(require_permission("question:update"))
):
    updated_count = await crud.bulk_update_category(req.question_ids, req.category_id)
    await cache.invalidate_pattern("questions:list:*")
    return {"updated_count": updated_count}
