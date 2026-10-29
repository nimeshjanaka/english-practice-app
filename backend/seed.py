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


NUMBER_WORDS = [
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
]


def _match_number_exercise(lesson_id: int, digit: int, word: str) -> Exercise:
    # Shuffle-ish stable order: rotate the bank so each question feels different
    start = (digit - 1) % len(NUMBER_WORDS)
    options = NUMBER_WORDS[start:] + NUMBER_WORDS[:start]
    return Exercise(
        lesson_id=lesson_id,
        type="drag-drop-match",
        question_data={
            "prompt": "Match the numbers",
            "prompt_value": str(digit),
            "options": options,
            "instruction": "Drag and drop the correct answer here",
        },
        correct_answer={"answer": word},
    )


def _ensure_units_and_lessons(db) -> dict[str, Lesson]:
    unit1 = db.query(Unit).filter(Unit.title == "Unit 1: Basics").first()
    unit2 = db.query(Unit).filter(Unit.title == "Unit 2: Daily Life").first()

    if unit1 is None:
        unit1 = Unit(title="Unit 1: Basics", order_index=1)
        db.add(unit1)
    if unit2 is None:
        unit2 = Unit(title="Unit 2: Daily Life", order_index=2)
        db.add(unit2)
    db.flush()

    wanted = [
        ("Hello & Goodbye", "wave", 1, unit1.id),
        ("Introducing Yourself", "user", 2, unit1.id),
        ("Numbers 1-10", "hash", 3, unit1.id),
    ]
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
    return by_title


def _ensure_exercises(db, lessons: dict[str, Lesson]) -> None:
    hello = lessons["Hello & Goodbye"]
    numbers = lessons["Numbers 1-10"]
    intro = lessons["Introducing Yourself"]

    # Clear old demo exercises for these lessons so Match UI is consistent
    for lesson in (hello, numbers, intro):
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

    # Numbers 1–10 — Match the numbers (like the reference screens)
    for digit, word in enumerate(NUMBER_WORDS, start=1):
        db.add(_match_number_exercise(numbers.id, digit, word))


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
