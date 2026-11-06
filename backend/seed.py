"""
Seed PostgreSQL with sample units, lessons, and Match-style drag/drop exercises.

Run from the backend folder (with venv activated):

    python seed.py
"""

from __future__ import annotations

from app.database import SessionLocal
from app.models.exercise import Exercise
from app.models.lesson import Lesson
from app.models.unit import Unit
from app.models.user_progress import UserProgress


PATH_LESSONS = [
    ("Greetings", "wave", 1),
    ("Introductions", "users", 2),
    ("Personal information", "user", 3),
    ("Countries", "globe", 4),
    ("Jobs", "briefcase", 5),
    ("Asking questions", "message", 6),
    ("Listening", "headphones", 7),
    ("Speaking", "mic", 8),
    ("Revision", "refresh", 9),
    ("Unit test", "exam", 10),
]


def _retire_old_path(db) -> None:
    """Remove the previous Basics / Daily Life path so only the new trail remains."""
    old_units = db.query(Unit).filter(Unit.title.in_(("Unit 1: Basics", "Unit 2: Daily Life"))).all()
    old_ids = [unit.id for unit in old_units]
    if not old_ids:
        return
    lesson_ids = [row.id for row in db.query(Lesson.id).filter(Lesson.unit_id.in_(old_ids)).all()]
    if lesson_ids:
        db.query(UserProgress).filter(UserProgress.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)
        db.query(Exercise).filter(Exercise.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)
        db.query(Lesson).filter(Lesson.id.in_(lesson_ids)).delete(synchronize_session=False)
    for unit in old_units:
        db.delete(unit)
    db.flush()


def _ensure_course(db, unit: Unit) -> None:
    """Attach the path unit to a published A1 course so /api/v1/courses can list it."""
    from app.domain.content import LEVEL_SEED
    from app.models.curriculum import CefrLevel, Course

    for code, name, description, order in LEVEL_SEED:
        if db.get(CefrLevel, code) is None:
            db.add(CefrLevel(code=code, name=name, description=description, sort_order=order))
    db.flush()

    course = db.query(Course).filter(Course.title == "A1 English").first()
    if course is None:
        course = Course(
            level_code="A1",
            title="A1 English",
            description="First release: introducing yourself and basic communication.",
            status="published",
            order_index=1,
        )
        db.add(course)
        db.flush()
    elif course.status not in ("published", "approved"):
        course.status = "published"

    unit.course_id = course.id
    unit.level_code = unit.level_code or "A1"


def _ensure_units_and_lessons(db) -> dict[str, Lesson]:
    _retire_old_path(db)
    unit = db.query(Unit).filter(Unit.title == "Introducing Yourself").first()
    if unit is None:
        unit = Unit(
            title="Introducing Yourself",
            order_index=1,
            level_code="A1",
            description="Say hello and introduce yourself.",
            outcome="Hold a short first conversation.",
            status="published",
        )
        db.add(unit)
        db.flush()

    wanted = [(title, icon, order, unit.id) for title, icon, order in PATH_LESSONS]
    by_title: dict[str, Lesson] = {}
    for title, icon, order_index, unit_id in wanted:
        lesson = (
            db.query(Lesson)
            .filter(Lesson.unit_id == unit_id, Lesson.title == title)
            .first()
        )
        if lesson is None:
            lesson = Lesson(
                unit_id=unit_id,
                title=title,
                icon_name=icon,
                order_index=order_index,
            )
            db.add(lesson)
            db.flush()
        by_title[title] = lesson
    _ensure_course(db, unit)
    return by_title


def _ensure_exercises(db, lessons: dict[str, Lesson]) -> None:
    hello = lessons["Greetings"]
    intro = lessons["Introductions"]

    for lesson in (hello, intro):
        db.query(Exercise).filter(Exercise.lesson_id == lesson.id).delete()

    # Hello — match greeting words
    db.add(
        Exercise(
            lesson_id=hello.id,
            type="drag-drop-match",
            question_data={
                "prompt": "Match the greeting",
                "prompt_value": "👋",
                "options": [
                    "Hello",
                    "Goodbye",
                    "Thanks",
                    "Please",
                    "Sorry",
                    "Yes",
                    "No",
                    "Okay",
                    "Welcome",
                    "Later",
                ],
                "instruction": "Drag and drop the correct answer here",
            },
            correct_answer={"answer": "Hello"},
        )
    )
    db.add(
        Exercise(
            lesson_id=hello.id,
            type="drag-drop-match",
            question_data={
                "prompt": "Match the goodbye",
                "prompt_value": "🚪",
                "options": [
                    "Hello",
                    "Goodbye",
                    "Thanks",
                    "Please",
                    "Sorry",
                    "Yes",
                    "No",
                    "Okay",
                    "Welcome",
                    "Later",
                ],
                "instruction": "Drag and drop the correct answer here",
            },
            correct_answer={"answer": "Goodbye"},
        )
    )

    # Introducing yourself
    db.add(
        Exercise(
            lesson_id=intro.id,
            type="drag-drop-match",
            question_data={
                "prompt": "Complete: My name _____ Sam.",
                "prompt_value": "My name _____ Sam.",
                "options": [
                    "is",
                    "am",
                    "are",
                    "be",
                    "was",
                    "were",
                    "this",
                    "that",
                    "a",
                    "the",
                ],
                "instruction": "Drag and drop the correct answer here",
            },
            correct_answer={"answer": "is"},
        )
    )


def seed() -> None:
    db = SessionLocal()
    try:
        lessons = _ensure_units_and_lessons(db)
        _ensure_exercises(db, lessons)
        db.commit()

        print("Seed complete (Match-style drag/drop exercises).")
        for title, lesson in lessons.items():
            count = db.query(Exercise).filter(Exercise.lesson_id == lesson.id).count()
            print(f"  Lesson '{title}' (id={lesson.id}) → {count} exercise(s)")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
