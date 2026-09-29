from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import crud
import schemas
from dependencies import require_permission, get_current_user, require_internal_token

router = APIRouter()

@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def create_snapshots_bulk(
    snapshots: List[schemas.ExamQuestionSnapshotCreate],
    internal_valid: bool = Depends(require_internal_token)
):
    snapshots_data = [s.model_dump(exclude_unset=True) for s in snapshots]
    inserted = await crud.create_exam_snapshots(snapshots_data)
    return {"inserted": inserted}

@router.get("/{exam_id}", response_model=List[schemas.ExamQuestionSnapshotResponse])
async def get_exam_snapshots(
    exam_id: str,
    internal_valid: bool = Depends(require_internal_token)
):
    snapshots = await crud.get_exam_snapshots(exam_id)
    return [schemas.ExamQuestionSnapshotResponse.from_mongo(s) for s in snapshots]
