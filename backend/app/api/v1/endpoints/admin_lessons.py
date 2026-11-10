"""Admin lesson creation and AI draft review."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin
from app.models.curriculum import Course
from app.models.unit import Unit
from app.models.user import User
from app.schemas.curriculum import AdminLessonCreate, AdminLessonOut
from app.services.curriculum import create_catalog_lesson

router = APIRouter()


@router.post("/lessons", response_model=AdminLessonOut, status_code=status.HTTP_201_CREATED)
def create_lesson(
    payload: AdminLessonCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminLessonOut:
    """Create a draft lesson from the curriculum form."""
    try:
        lesson = create_catalog_lesson(db, payload.title, payload.unit, payload.level, payload.order_index)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    unit = db.get(Unit, lesson.unit_id)
    course = db.get(Course, unit.course_id) if unit is not None and unit.course_id is not None else None
    return AdminLessonOut(
        id=lesson.id,
        title=lesson.title,
        unit=unit.title if unit is not None else payload.unit,
        level=course.level_code if course is not None else payload.level.strip().upper(),
        order_index=lesson.order_index,
        status=lesson.status,
    )
