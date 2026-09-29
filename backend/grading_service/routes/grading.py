from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional

import schemas, models
from database import get_db
from dependencies import get_current_user
from dependencies import get_current_user, require_internal_token
from tasks.grading_tasks import grade_exam

router = APIRouter(prefix="/api/v1/grading", tags=["Grading"])

@router.post("/submit", response_model=schemas.SubmissionResponse)
async def submit_exam(
    submission: schemas.SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    internal_valid: bool = Depends(require_internal_token)
):
    # Check if result already exists for this attempt
    attempt_id = str(submission.attempt_id)
    
    stmt = select(models.Result).where(models.Result.attempt_id == UUID(attempt_id))
    result = await db.execute(stmt)
    if result.scalars().first():
        # Check if submission exists
        sub_stmt = select(models.Submission).where(models.Submission.attempt_id == UUID(attempt_id))
        sub_res = await db.execute(sub_stmt)
        existing_sub = sub_res.scalars().first()
        if existing_sub:
            return {
                "submission_id": str(existing_sub.id),
                "status": "already_processed",
                "message": "Attempt already graded"
            }
        else:
            raise HTTPException(status_code=400, detail="Attempt already graded but submission missing")

    # Check if submission already exists (idempotency)
    sub_stmt = select(models.Submission).where(models.Submission.attempt_id == UUID(attempt_id))
    sub_res = await db.execute(sub_stmt)
    existing_sub = sub_res.scalars().first()
    if existing_sub:
        return {
            "submission_id": str(existing_sub.id),
            "status": "already_submitted",
            "message": "Exam already submitted and is being graded."
        }

    # Create submission record
    db_submission = models.Submission(
        attempt_id=UUID(str(attempt_id)),
        exam_id=UUID(str(submission.exam_id)),
        user_id=UUID(str(submission.user_id)),
        answers=submission.answers
    )
    db.add(db_submission)
    from sqlalchemy.exc import IntegrityError
    try:
        await db.commit()
        await db.refresh(db_submission)
    except IntegrityError:
        await db.rollback()
        # Race condition happened, return idempotently
        sub_stmt = select(models.Submission).where(models.Submission.attempt_id == UUID(attempt_id))
        sub_res = await db.execute(sub_stmt)
        existing_sub = sub_res.scalars().first()
        if existing_sub:
            return {
                "submission_id": str(existing_sub.id),
                "status": "already_submitted",
                "message": "Exam already submitted and is being graded."
            }
        raise HTTPException(status_code=500, detail="Database integrity error on submission")

    # Queue Celery task
    grade_exam.delay(
        str(db_submission.id),
        str(submission.exam_id),
        str(submission.user_id),
        submission.answers,
        None,
        {"attempt_id": attempt_id}
    )

    return {
        "submission_id": str(db_submission.id),
        "status": "processing",
        "message": "Exam submitted and is being graded."
    }

@router.get("/result/{attempt_id}", response_model=schemas.ResultResponse)
async def get_exam_result(
    attempt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from sqlalchemy.orm import selectinload
    stmt = select(models.Result).options(selectinload(models.Result.question_results)).where(
        models.Result.attempt_id == attempt_id
    )
    result = await db.execute(stmt)
    db_result = result.scalars().first()
    
    if not db_result:
        raise HTTPException(status_code=404, detail="Result not found or not graded yet")
        
    if str(db_result.user_id) != current_user["id"] and current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
        
    return db_result

@router.get("/status/{submission_id}")
async def get_submission_status(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    stmt = select(models.Submission).where(models.Submission.id == submission_id)
    result = await db.execute(stmt)
    submission = result.scalars().first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    if str(submission.user_id) != current_user["id"] and current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
        
    return {
        "submission_id": submission.id,
        "processed": submission.processed
    }


@router.get("/pending-manual", response_model=list[schemas.PendingManualGradeItem])
async def list_pending_manual_grading(
    exam_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Danh sách câu tự luận đang chờ giáo viên chấm tay. Chỉ admin/teacher được xem."""
    if current_user["role"] not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Access denied")

    stmt = (
        select(
            models.QuestionResult.id,
            models.QuestionResult.question_id,
            models.QuestionResult.user_answer,
            models.QuestionResult.point_possible,
            models.Result.id.label("result_id"),
            models.Result.attempt_id,
            models.Result.exam_id,
            models.Result.user_id,
        )
        .join(models.Result, models.QuestionResult.result_id == models.Result.id)
        .where(models.QuestionResult.needs_manual_grading == True)  # noqa: E712
        .where(models.QuestionResult.graded_by_user_id.is_(None))
    )

    if current_user["role"] == "teacher":
        from sqlalchemy import text
        allowed_exams_stmt = text(
            """
            SELECT id FROM exams WHERE owner_id = :uid
            UNION
            SELECT exam_id FROM exam_collaborators WHERE user_id = :uid
            UNION
            SELECT exam_id FROM exam_proctors WHERE user_id = :uid
            """
        )
        allowed_res = await db.execute(allowed_exams_stmt, {"uid": current_user["id"]})
        allowed_exam_ids = [row[0] for row in allowed_res.fetchall()]
        if not allowed_exam_ids:
            return []
        stmt = stmt.where(models.Result.exam_id.in_(allowed_exam_ids))

    if exam_id:
        stmt = stmt.where(models.Result.exam_id == exam_id)

    rows = (await db.execute(stmt)).all()
    return [
        {
            "result_id": r.result_id,
            "attempt_id": r.attempt_id,
            "exam_id": r.exam_id,
            "user_id": r.user_id,
            "question_id": r.question_id,
            "user_answer": r.user_answer,
            "point_possible": r.point_possible,
        }
        for r in rows
    ]


@router.post("/manual-grade/{result_id}/{question_id}", response_model=schemas.ResultResponse)
async def manual_grade_question(
    result_id: UUID,
    question_id: str,
    grade: schemas.ManualGradeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Giáo viên/Admin chấm điểm tay cho câu tự luận, sau đó tự động cộng lại tổng điểm của bài thi."""
    if current_user["role"] not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Access denied")

    if current_user["role"] == "teacher":
        from sqlalchemy import text
        check_stmt = text(
            """
            SELECT 1 FROM results r
            WHERE r.id = :rid AND (
                EXISTS (SELECT 1 FROM exams e WHERE e.id = r.exam_id AND e.owner_id = :uid)
                OR EXISTS (SELECT 1 FROM exam_collaborators ec WHERE ec.exam_id = r.exam_id AND ec.user_id = :uid)
                OR EXISTS (SELECT 1 FROM exam_proctors ep WHERE ep.exam_id = r.exam_id AND ep.user_id = :uid)
            )
            """
        )
        has_perm = (await db.execute(check_stmt, {"rid": result_id, "uid": current_user["id"]})).scalar()
        if not has_perm:
            raise HTTPException(status_code=403, detail="Bạn không có quyền chấm bài thi này.")

    qr_stmt = select(models.QuestionResult).where(
        models.QuestionResult.result_id == result_id,
        models.QuestionResult.question_id == question_id,
    )
    qr = (await db.execute(qr_stmt)).scalars().first()
    if not qr:
        raise HTTPException(status_code=404, detail="Question result not found")

    if grade.point_earned > qr.point_possible:
        raise HTTPException(status_code=400, detail=f"Điểm chấm không được vượt quá điểm tối đa ({qr.point_possible})")

    qr.point_earned = grade.point_earned
    qr.is_correct = grade.point_earned >= qr.point_possible
    qr.needs_manual_grading = False
    qr.graded_by_user_id = current_user["id"]
    qr.manual_grading_note = grade.note

    # Cộng lại tổng điểm của toàn bộ bài thi sau khi chấm tay câu này
    result_stmt = select(models.Result).where(models.Result.id == result_id)
    db_result = (await db.execute(result_stmt)).scalars().first()
    if not db_result:
        raise HTTPException(status_code=404, detail="Result not found")

    all_qr_stmt = select(models.QuestionResult).where(models.QuestionResult.result_id == result_id)
    all_qr = (await db.execute(all_qr_stmt)).scalars().all()

    total_earned = sum((q.point_earned or 0) for q in all_qr if q.id != qr.id) + grade.point_earned
    total_possible = sum((q.point_possible or 0) for q in all_qr)
    still_pending = any(q.needs_manual_grading and q.id != qr.id for q in all_qr)

    db_result.score = total_earned
    db_result.percentage = (total_earned / total_possible * 100) if total_possible > 0 else 0
    db_result.has_pending_manual_grading = still_pending

    await db.commit()
    await db.refresh(db_result, attribute_names=['question_results'])
    return db_result
