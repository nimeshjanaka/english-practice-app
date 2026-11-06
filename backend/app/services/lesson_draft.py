"""Build and store AI lesson drafts. Drafts are never published here."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.content import EXERCISE_TYPES, LEGACY_EXERCISE_TYPES, LEVEL_SEED
from app.models.curriculum import CefrLevel
from app.models.exercise import Exercise
from app.models.lesson import Lesson
from app.models.unit import Unit
from app.schemas.curriculum import DraftExercise, LessonDraft


def _question(kind: str, topic: str, index: int) -> tuple[dict, dict, str]:
    """Local template for one exercise. A provider can replace this later."""
    number = index + 1
    if kind == "true_false":
        return (
            {"question": f"True or false ({number}): '{topic}' is a polite English phrase.", "options": ["True", "False"]},
            {"answer": "True"},
            "Decide whether the phrase fits a polite conversation.",
        )
    if kind == "fill_blank":
        return (
            {"sentence": f"Complete this {topic} sentence ({number}): Hello, my name _____ Sam.", "options": ["is", "are", "am"]},
            {"answer": "is"},
            "Use 'is' after 'name'.",
        )
    if kind in {"matching", "drag_drop"}:
        return (
            {"prompt": f"Match the {topic} pair {number}.", "pairs": [["Hello", "A greeting"], ["Goodbye", "A farewell"]]},
            {"pairs": [["Hello", "A greeting"], ["Goodbye", "A farewell"]]},
            "Match each phrase with its meaning.",
        )
    return (
        {
            "question": f"{topic}: choose the best answer for item {number}.",
            "options": ["Good night", "Good morning", "Goodbye", "See you"],
        },
        {"answer": "Good morning"},
        "Pick the phrase that fits the situation.",
    )


def build_lesson_draft(
    level_code: str,
    unit_title: str,
    lesson_topic: str,
    exercise_count: int,
    exercise_types: list[str],
) -> dict:
    """Return a lesson draft. This does not write to the database."""
    types = [kind for kind in exercise_types if kind in EXERCISE_TYPES]
    if not types:
        raise ValueError("Choose at least one supported exercise type")

    exercises: list[dict] = []
    for index in range(exercise_count):
        kind = types[index % len(types)]
        question_data, correct_answer, explanation = _question(kind, lesson_topic, index)
        exercises.append(
            {
                "type": kind,
                "prompt": f"{lesson_topic}: practice item {index + 1}",
                "question_data": question_data,
                "correct_answer": correct_answer,
                "explanation": explanation,
                "feedback": "Review this item before publishing.",
                "difficulty": level_code,
                "marks": 1,
                "learning_objective": lesson_topic,
                "order_index": index + 1,
                "status": "generated",
            }
        )

    return {
        "level_code": level_code,
        "unit_title": unit_title,
        "lesson_topic": lesson_topic,
        "summary": "AI draft — needs human review",
        "status": "generated",
        "exercises": exercises,
    }


def _ensure_levels(db: Session) -> None:
    for code, name, description, order in LEVEL_SEED:
        if db.get(CefrLevel, code) is None:
            db.add(CefrLevel(code=code, name=name, description=description, sort_order=order))
    db.flush()


def save_lesson_draft(db: Session, draft: LessonDraft) -> dict:
    """Store an edited draft as a generated lesson. Students do not see it until it is published."""
    if draft.level_code not in {code for code, *_rest in LEVEL_SEED}:
        raise ValueError("Unknown CEFR level")
    _ensure_levels(db)

    allowed = set(EXERCISE_TYPES) | set(LEGACY_EXERCISE_TYPES)
    exercises = [item for item in draft.exercises if item.type in allowed]
    if not exercises:
        raise ValueError("Draft has no supported exercises")

    unit = db.scalar(select(Unit).where(Unit.title == draft.unit_title))
    if unit is None:
        unit = Unit(
            title=draft.unit_title,
            order_index=1,
            level_code=draft.level_code,
            status="draft",
            description="Generated draft unit",
        )
        db.add(unit)
        db.flush()

    lesson = Lesson(
        unit_id=unit.id,
        title=draft.lesson_topic,
        icon_name="spark",
        order_index=99,
        summary=draft.summary,
        status="generated",
    )
    db.add(lesson)
    db.flush()

    for item in exercises:
        _add_exercise(db, lesson.id, item)
    db.commit()
    return {
        "lesson_id": lesson.id,
        "unit_id": unit.id,
        "exercises_created": len(exercises),
        "status": "generated",
        "note": "Draft only. Approve and publish before students can rely on it.",
    }


def _add_exercise(db: Session, lesson_id: int, item: DraftExercise) -> None:
    db.add(
        Exercise(
            lesson_id=lesson_id,
            type=item.type,
            prompt=item.prompt,
            question_data=item.question_data,
            correct_answer=item.correct_answer,
            explanation=item.explanation,
            feedback=item.feedback,
            difficulty=item.difficulty,
            marks=item.marks,
            learning_objective=item.learning_objective,
            order_index=item.order_index,
            status="generated",
        )
    )
