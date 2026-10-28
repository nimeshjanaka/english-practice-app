"""
Seed PostgreSQL with sample units, lessons, and one fill-in-the-blank exercise.

Run from the backend folder (with venv activated):

    python seed.py
"""

from __future__ import annotations

from app.database import SessionLocal
from app.models.exercise import Exercise
from app.models.lesson import Lesson
from app.models.unit import Unit


def seed() -> None:
    db = SessionLocal()
    try:
        existing = db.query(Unit).filter(Unit.title == "Unit 1: Basics").first()
        if existing is not None:
            print("Seed data already present (found 'Unit 1: Basics'). Nothing to do.")
            return

        unit1 = Unit(title="Unit 1: Basics", order_index=1)
        unit2 = Unit(title="Unit 2: Daily Life", order_index=2)
        db.add_all([unit1, unit2])
        db.flush()

        lessons = [
            Lesson(
                unit_id=unit1.id,
                title="Hello & Goodbye",
                icon_name="wave",
                order_index=1,
            ),
            Lesson(
                unit_id=unit1.id,
                title="Introducing Yourself",
                icon_name="user",
                order_index=2,
            ),
            Lesson(
                unit_id=unit1.id,
                title="Numbers 1-10",
                icon_name="hash",
                order_index=3,
            ),
        ]
        db.add_all(lessons)
        db.flush()

        first_lesson = lessons[0]
        exercise = Exercise(
            lesson_id=first_lesson.id,
            type="fill-in-the-blank",
            question_data={
                "prompt": "Hello, _____ is my name.",
                "blanks": 1,
            },
            correct_answer={
                "answers": ["this"],
            },
        )
        db.add(exercise)
        db.commit()

        print("Seed complete.")
        print(f"  Units:   {unit1.title} (id={unit1.id}), {unit2.title} (id={unit2.id})")
        print(
            "  Lessons: "
            + ", ".join(f"{lesson.title} (id={lesson.id})" for lesson in lessons)
        )
        print(
            f"  Exercise: fill-in-the-blank on '{first_lesson.title}' "
            f"(exercise id={exercise.id})"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
