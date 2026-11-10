"""Learner attempts for one exercise."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.exercise import Exercise
from app.models.user import User
from app.schemas.exercise import ExerciseSubmit, ExerciseSubmitResult
from app.services.exercise_check import evaluate_exercise
from app.services.progress import record_exercise_attempt

router = APIRouter()


@router.post("/{exercise_id}/attempts", response_model=ExerciseSubmitResult)
def create_attempt(
    exercise_id: int,
    payload: ExerciseSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExerciseSubmitResult:
    """Check one answer, store the attempt, and refresh lesson progress."""
    exercise = db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    result = evaluate_exercise(exercise, payload)
    record_exercise_attempt(
        db,
        user_id=current_user.id,
        exercise=exercise,
        submission=payload,
        is_correct=bool(result["is_correct"]),
    )
    return ExerciseSubmitResult(**result)
