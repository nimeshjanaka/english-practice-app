"""Course reads for learners and the admin curriculum table."""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.domain.content import CEFR_CODES, LEARNER_VISIBLE_STATUSES, LEVEL_SEED
from app.models.curriculum import CefrLevel, Course
from app.models.exercise import Exercise
from app.models.lesson import Lesson
from app.models.unit import Unit
from app.models.user_progress import UserProgress


def list_visible_courses(db: Session) -> list[Course]:
    """Courses a learner is allowed to see, oldest order first."""
    return list(
        db.scalars(
            select(Course)
            .where(Course.status.in_(LEARNER_VISIBLE_STATUSES))
            .order_by(Course.order_index, Course.id)
        ).all()
    )


def list_course_paths(db: Session, user_id: int) -> list[dict]:
    """Published courses with their visible lessons and this learner's completion."""
    completed_ids = set(
        db.scalars(
            select(UserProgress.lesson_id).where(
                UserProgress.user_id == user_id,
                UserProgress.is_completed.is_(True),
            )
        ).all()
    )
    paths: list[dict] = []
    for course in list_visible_courses(db):
        units = list(
            db.scalars(
                select(Unit)
                .where(Unit.course_id == course.id, Unit.status.in_(LEARNER_VISIBLE_STATUSES))
                .options(selectinload(Unit.lessons))
                .order_by(Unit.order_index, Unit.id)
            ).all()
        )
        lessons: list[dict] = []
        for unit in units:
            visible = [lesson for lesson in unit.lessons if lesson.status in LEARNER_VISIBLE_STATUSES]
            for lesson in sorted(visible, key=lambda item: (item.order_index, item.id)):
                lessons.append(
                    {
                        "id": lesson.id,
                        "title": lesson.title,
                        "icon_name": lesson.icon_name,
                        "order_index": lesson.order_index,
                        "is_completed": lesson.id in completed_ids,
                        "unit_title": unit.title,
                        "status": lesson.status,
                    }
                )
        paths.append(
            {
                "id": course.id,
                "level_code": course.level_code,
                "title": course.title,
                "description": course.description,
                "status": course.status,
                "order_index": course.order_index,
                "lessons": lessons,
            }
        )
    return paths


def list_admin_course_catalog(db: Session, user_id: int) -> list[dict]:
    """Every course and lesson, including drafts, for the curriculum table."""
    completed_ids = set(
        db.scalars(
            select(UserProgress.lesson_id).where(
                UserProgress.user_id == user_id,
                UserProgress.is_completed.is_(True),
            )
        ).all()
    )
    courses = list(db.scalars(select(Course).order_by(Course.order_index, Course.id)).all())
    paths: list[dict] = []
    for course in courses:
        units = list(
            db.scalars(
                select(Unit)
                .where(Unit.course_id == course.id)
                .options(selectinload(Unit.lessons))
                .order_by(Unit.order_index, Unit.id)
            ).all()
        )
        lessons: list[dict] = []
        for unit in units:
            for lesson in sorted(unit.lessons, key=lambda item: (item.order_index, item.id)):
                lessons.append(
                    {
                        "id": lesson.id,
                        "title": lesson.title,
                        "icon_name": lesson.icon_name,
                        "order_index": lesson.order_index,
                        "is_completed": lesson.id in completed_ids,
                        "unit_title": unit.title,
                        "status": lesson.status,
                    }
                )
        paths.append(
            {
                "id": course.id,
                "level_code": course.level_code,
                "title": course.title,
                "description": course.description,
                "status": course.status,
                "order_index": course.order_index,
                "lessons": lessons,
            }
        )
    return paths


def create_catalog_lesson(db: Session, title: str, unit_name: str, level: str, order_index: int) -> Lesson:
    """Create a draft lesson under the named unit and CEFR level."""
    code = level.strip().upper()
    if code not in CEFR_CODES:
        raise ValueError("Level must be one of A1, A2, B1, B2, C1, C2")
    clean_title = title.strip()
    clean_unit = unit_name.strip()
    if not clean_title or not clean_unit:
        raise ValueError("Title and unit are required")

    for seed_code, name, description, sort_order in LEVEL_SEED:
        if db.get(CefrLevel, seed_code) is None:
            db.add(CefrLevel(code=seed_code, name=name, description=description, sort_order=sort_order))
    db.flush()

    course = db.scalar(select(Course).where(Course.level_code == code).order_by(Course.order_index, Course.id))
    if course is None:
        course = Course(level_code=code, title=f"{code} English", description="", status="draft", order_index=1)
        db.add(course)
        db.flush()

    unit = db.scalar(select(Unit).where(Unit.course_id == course.id, Unit.title == clean_unit))
    if unit is None:
        unit = Unit(
            title=clean_unit,
            order_index=1,
            course_id=course.id,
            level_code=code,
            status="draft",
            description="",
        )
        db.add(unit)
        db.flush()

    lesson = Lesson(
        unit_id=unit.id,
        title=clean_title,
        icon_name="book",
        order_index=order_index,
        summary="",
        status="draft",
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


def get_visible_lesson(db: Session, lesson_id: int) -> tuple[Lesson, list[Exercise]] | None:
    """Published or approved lesson plus its visible exercises."""
    lesson = db.scalar(
        select(Lesson)
        .where(Lesson.id == lesson_id, Lesson.status.in_(LEARNER_VISIBLE_STATUSES))
        .options(selectinload(Lesson.exercises))
    )
    if lesson is None:
        return None
    exercises = [
        exercise
        for exercise in sorted(lesson.exercises, key=lambda item: (item.order_index, item.id))
        if exercise.status in LEARNER_VISIBLE_STATUSES
    ]
    return lesson, exercises
