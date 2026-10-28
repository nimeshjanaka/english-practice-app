"""Admin-only CRUD for Units, Lessons, and Exercises."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin
from app.models.exercise import Exercise
from app.models.lesson import Lesson
from app.models.unit import Unit
from app.models.user import User
from app.schemas.exercise import ExerciseCreate, ExerciseResponse, ExerciseUpdate
from app.schemas.lesson import LessonCreate, LessonResponse, LessonUpdate
from app.schemas.unit import UnitCreate, UnitResponse, UnitUpdate

router = APIRouter()


# ---------------------------------------------------------------------------
# Units
# ---------------------------------------------------------------------------


@router.get("/units", response_model=list[UnitResponse])
def list_units(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[Unit]:
    """List all units (admin only)."""
    return list(db.scalars(select(Unit).order_by(Unit.order_index, Unit.id)).all())


@router.post("/units", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
def create_unit(
    payload: UnitCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Unit:
    """Create a unit (admin only)."""
    unit = Unit(**payload.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/units/{unit_id}", response_model=UnitResponse)
def get_unit(
    unit_id: int,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Unit:
    """Get a single unit (admin only)."""
    unit = db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")
    return unit


@router.patch("/units/{unit_id}", response_model=UnitResponse)
def update_unit(
    unit_id: int,
    payload: UnitUpdate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Unit:
    """Update a unit (admin only)."""
    unit = db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(unit, field, value)

    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(
    unit_id: int,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> None:
    """Delete a unit and its cascaded lessons/exercises (admin only)."""
    unit = db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")
    db.delete(unit)
    db.commit()


# ---------------------------------------------------------------------------
# Lessons
# ---------------------------------------------------------------------------


@router.get("/lessons", response_model=list[LessonResponse])
def list_lessons(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[Lesson]:
    """List all lessons (admin only)."""
    return list(db.scalars(select(Lesson).order_by(Lesson.order_index, Lesson.id)).all())


@router.post("/lessons", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
def create_lesson(
    payload: LessonCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Lesson:
    """Create a lesson (admin only)."""
    if db.get(Unit, payload.unit_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")

    lesson = Lesson(**payload.model_dump())
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.get("/lessons/{lesson_id}", response_model=LessonResponse)
def get_lesson(
    lesson_id: int,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Lesson:
    """Get a single lesson (admin only)."""
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson


@router.patch("/lessons/{lesson_id}", response_model=LessonResponse)
def update_lesson(
    lesson_id: int,
    payload: LessonUpdate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Lesson:
    """Update a lesson (admin only)."""
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    data = payload.model_dump(exclude_unset=True)
    if "unit_id" in data and db.get(Unit, data["unit_id"]) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")

    for field, value in data.items():
        setattr(lesson, field, value)

    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    lesson_id: int,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> None:
    """Delete a lesson and its cascaded exercises (admin only)."""
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    db.delete(lesson)
    db.commit()


# ---------------------------------------------------------------------------
# Exercises
# ---------------------------------------------------------------------------


@router.get("/exercises", response_model=list[ExerciseResponse])
def list_exercises(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[Exercise]:
    """List all exercises (admin only)."""
    return list(db.scalars(select(Exercise).order_by(Exercise.id)).all())


@router.post(
    "/exercises",
    response_model=ExerciseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_exercise(
    payload: ExerciseCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Exercise:
    """Create an exercise (admin only)."""
    if db.get(Lesson, payload.lesson_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    exercise = Exercise(**payload.model_dump())
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.get("/exercises/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(
    exercise_id: int,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Exercise:
    """Get a single exercise (admin only)."""
    exercise = db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    return exercise


@router.patch("/exercises/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(
    exercise_id: int,
    payload: ExerciseUpdate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Exercise:
    """Update an exercise (admin only)."""
    exercise = db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    data = payload.model_dump(exclude_unset=True)
    if "lesson_id" in data and db.get(Lesson, data["lesson_id"]) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    for field, value in data.items():
        setattr(exercise, field, value)

    db.commit()
    db.refresh(exercise)
    return exercise


@router.delete("/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(
    exercise_id: int,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> None:
    """Delete an exercise (admin only)."""
    exercise = db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    db.delete(exercise)
    db.commit()
