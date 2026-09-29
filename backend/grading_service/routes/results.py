from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

import models
from database import get_db
from dependencies import get_current_user

import os
from services.cache import CacheService

redis_url = os.getenv("REDIS_URL", "redis://redis_cache:6379")
cache = CacheService(redis_url)

router = APIRouter(prefix="/api/v1/results", tags=["Results"])

from services.exam_client import ExamClient

@router.get("/user/my-results")
async def get_my_results(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from sqlalchemy import desc
    stmt = select(models.Result).where(models.Result.user_id == UUID(str(current_user["id"]))).order_by(desc(models.Result.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/exam/{exam_id}")
async def get_results_by_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role = current_user["role"]
    if role == "proctor":
        raise HTTPException(status_code=403, detail="Proctors cannot view results")

    async def fetch_data():
        if role in ["admin", "teacher"]:
            stmt = select(models.Result).where(models.Result.exam_id == exam_id)
        else:
            stmt = select(models.Result).where(models.Result.exam_id == exam_id, models.Result.user_id == UUID(str(current_user["id"])))
        result = await db.execute(stmt)
        return result.scalars().all()

    key = f"results:exam:{exam_id}:user:{current_user['id']}"
    return await cache.get_or_set(key, fetch_data, ttl=300)

@router.get("/{attempt_id}")
async def get_result(
    attempt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    stmt = select(models.Result).where(models.Result.attempt_id == attempt_id)
    result = await db.execute(stmt)
    db_result = result.scalars().first()
    
    if not db_result:
        raise HTTPException(status_code=404, detail="Result not found")
        
    role = current_user["role"]
    if role == "proctor":
        raise HTTPException(status_code=403, detail="Proctors cannot view results")
        
    if role == "student" and str(db_result.user_id) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to view this result")
        
    return db_result

