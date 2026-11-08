"""Learner progress overview and session close endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.progress import LearningSessionEnd, LearningSessionOut, ProgressOverview
from app.services.progress import end_learning_session, progress_overview

router = APIRouter()


@router.get("/overview", response_model=ProgressOverview)
def get_progress_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProgressOverview:
    """Lessons completed, speaking time, and current streak for Profile."""
    return ProgressOverview(**progress_overview(db, current_user.id))


@router.post("/sessions/end", response_model=LearningSessionOut)
def close_learning_session(
    payload: LearningSessionEnd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LearningSessionOut:
    """Save total time when an AI chat (or other) practice block ends."""
    row = end_learning_session(
        db,
        user_id=current_user.id,
        session_type=payload.session_type,
        duration_seconds=payload.duration_seconds,
        lesson_id=payload.lesson_id,
    )
    return LearningSessionOut(
        id=row.id,
        session_type=row.session_type,
        duration_seconds=row.duration_seconds,
        lesson_id=row.lesson_id,
    )
