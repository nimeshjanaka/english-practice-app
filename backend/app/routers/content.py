"""CRUD for Units, Lessons, and Exercises (mutations are admin-only)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_admin, get_current_user
from app.models.exercise import Exercise
from app.models.lesson import Lesson
from app.models.unit import Unit
from app.models.user import User
from app.models.user_progress import UserProgress
from app.schemas.exercise import ExerciseCreate, ExerciseResponse, ExerciseUpdate
from app.schemas.lesson import LessonCreate, LessonPathItem, LessonResponse, LessonUpdate
from app.schemas.unit import UnitCreate, UnitResponse, UnitUpdate, UnitWithLessonsResponse

router = APIRouter()


# ---------------------------------------------------------------------------
# Units
# ---------------------------------------------------------------------------


@router.get("/units", response_model=list[UnitWithLessonsResponse])
def list_units(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[UnitWithLessonsResponse]:
    """
    List units with nested lessons for the learning path.

    Available to any authenticated user (mobile app + admin).
    Includes per-lesson `is_completed` for the current user.
    """
    units = list(
        db.scalars(
            select(Unit)
            .options(selectinload(Unit.lessons))
            .order_by(Unit.order_index, Unit.id)
        ).all()
    )

    progress_rows = db.scalars(
        select(UserProgress).where(UserProgress.user_id == current_user.id)
    ).all()
    completed_ids = {row.lesson_id for row in progress_rows if row.is_completed}

    result: list[UnitWithLessonsResponse] = []
    for unit in units:
        lessons_sorted = sorted(unit.lessons, key=lambda lesson: (lesson.order_index, lesson.id))
        result.append(
            UnitWithLessonsResponse(
                id=unit.id,
                title=unit.title,
                order_index=unit.order_index,
                lessons=[
                    LessonPathItem(
                        id=lesson.id,
                        unit_id=lesson.unit_id,
                        title=lesson.title,
                        icon_name=lesson.icon_name,
                        order_index=lesson.order_index,
                        is_completed=lesson.id in completed_ids,
                    )
                    for lesson in lessons_sorted
                ],
            )
        )
    return result


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


@router.get(
    "/lessons/{lesson_id}/exercises",
    response_model=list[ExerciseResponse],
)
def list_lesson_exercises(
    lesson_id: int,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Exercise]:
    """List exercises for a lesson (any authenticated user — mobile app)."""
    if db.get(Lesson, lesson_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    return list(
        db.scalars(
            select(Exercise).where(Exercise.lesson_id == lesson_id).order_by(Exercise.id)
        ).all()
    )


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
