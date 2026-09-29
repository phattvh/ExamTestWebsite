from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import crud, schemas, models
from database import get_db
from dependencies import require_permission, get_current_user

router = APIRouter(prefix="/api/v1/exams/{exam_id}", tags=["Exam Assignments"])

def verify_owner_or_admin(exam, current_user):
    if current_user.get("role") != "admin" and str(exam.owner_id) != str(current_user.get("id")):
        raise HTTPException(status_code=403, detail="Only exam owner or admin can assign roles")

@router.post("/collaborators", status_code=status.HTTP_201_CREATED)
async def add_collaborator(
    exam_id: str,
    collaborator: schemas.ExamCollaboratorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("exam:assign"))
):
    exam = await crud.get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    verify_owner_or_admin(exam, current_user)
    return await crud.add_exam_collaborator(db, exam_id, collaborator)

@router.post("/proctors", status_code=status.HTTP_201_CREATED)
async def add_proctor(
    exam_id: str,
    proctor: schemas.ExamProctorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("exam:assign"))
):
    exam = await crud.get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    verify_owner_or_admin(exam, current_user)
    return await crud.add_exam_proctor(db, exam_id, proctor)

@router.get("/proctors")
async def list_proctors(
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("exam:read"))
):
    exam = await crud.get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return await crud.list_exam_proctors(db, exam_id)

@router.delete("/proctors/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_proctor(
    exam_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("exam:assign"))
):
    exam = await crud.get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    verify_owner_or_admin(exam, current_user)
    await crud.remove_exam_proctor(db, exam_id, user_id)

@router.post("/roster", status_code=status.HTTP_201_CREATED)
async def add_roster(
    exam_id: str,
    roster: schemas.ExamRosterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission("exam:assign"))
):
    exam = await crud.get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    verify_owner_or_admin(exam, current_user)
    return await crud.add_exam_roster(db, exam_id, roster)
