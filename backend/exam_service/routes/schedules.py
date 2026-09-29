from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import crud, schemas
from database import get_db
from dependencies import require_permission

router = APIRouter(prefix="/api/v1/exams/{exam_id}", tags=["Exam Schedules"])

@router.post("/schedule", response_model=schemas.ExamScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    exam_id: str,
    schedule: schemas.ExamScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("exam:update"))
):
    if schedule.start_time >= schedule.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")
        
    exam = await crud.get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if current_user["role"] != "admin" and str(exam.owner_id) != current_user["id"]:
        raise HTTPException(status_code=403, detail="You don't have permission")
        
    return await crud.add_exam_schedule(db, exam_id, schedule)

@router.get("/schedule", response_model=list[schemas.ExamScheduleResponse])
async def list_schedules(
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("exam:read"))
):
    exam = await crud.get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam.schedules

@router.delete("/schedule/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    exam_id: str,
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("exam:update"))
):
    exam = await crud.get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if current_user["role"] != "admin" and str(exam.owner_id) != current_user["id"]:
        raise HTTPException(status_code=403, detail="You don't have permission")
    await crud.delete_exam_schedule(db, schedule_id)
