"""Learner curriculum reads: course list and one lesson with its exercises."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import require_student
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.curriculum import CoursePathOut
from app.schemas.lesson import LessonWithExercises
from app.services.curriculum import get_visible_lesson, list_admin_course_catalog, list_course_paths

router = APIRouter()


@router.get("/courses", response_model=list[CoursePathOut])
def list_courses(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Courses and lessons. Admins see drafts. Students see the published path."""
    if user.role == UserRole.ADMIN:
        return list_admin_course_catalog(db, user.id)
    return list_course_paths(db, user.id)


@router.get("/lessons/{lesson_id}", response_model=LessonWithExercises)
def get_lesson(
    lesson_id: int,
    _user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> LessonWithExercises:
    """Lesson details with learner-visible exercises."""
    found = get_visible_lesson(db, lesson_id)
    if found is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    lesson, exercises = found
    return LessonWithExercises(
        id=lesson.id,
        unit_id=lesson.unit_id,
        title=lesson.title,
        icon_name=lesson.icon_name,
        order_index=lesson.order_index,
        summary=lesson.summary,
        exercises=exercises,
    )
