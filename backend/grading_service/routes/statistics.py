from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from uuid import UUID

import models
from database import get_db
from dependencies import require_permission

router = APIRouter(prefix="/api/v1/grading/statistics", tags=["Statistics"])

from services.exam_client import ExamClient

@router.get("/{exam_id}")
async def get_exam_statistics(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("result:read_managed"))
):
    role = current_user["role"]
    if role == "teacher":
        exam_client = ExamClient()
        access = await exam_client.verify_exam_access(str(exam_id), current_user["token"])
        if not access or (not access.get("is_owner") and not access.get("is_collaborator")):
            raise HTTPException(status_code=403, detail="Not authorized to view statistics for this exam")

    stmt = select(models.Result).where(models.Result.exam_id == exam_id)
    result = await db.execute(stmt)
    results = result.scalars().all()
    
    if not results:
        return {
            "exam_id": exam_id,
            "total_submissions": 0,
            "average_score": 0.0,
            "highest_score": 0.0,
            "lowest_score": 0.0,
            "pass_rate": 0.0
        }
        
    total = len(results)
    scores = [r.score for r in results if r.score is not None]
    
    if not scores:
        return {
            "exam_id": exam_id,
            "total_submissions": total,
            "average_score": 0.0,
            "highest_score": 0.0,
            "lowest_score": 0.0,
            "pass_rate": 0.0
        }
        
    avg_score = sum(scores) / len(scores)
    highest = max(scores)
    lowest = min(scores)
    
    # We don't have passing_score directly in grading service, 
    # we assume passing if percentage >= 50 for now, or fetch from Exam Service
    passed = sum(1 for r in results if r.percentage is not None and r.percentage >= 50.0)
    pass_rate = (passed / total) * 100
    
    return {
        "exam_id": exam_id,
        "total_submissions": total,
        "average_score": avg_score,
        "highest_score": highest,
        "lowest_score": lowest,
        "pass_rate": pass_rate
    }
