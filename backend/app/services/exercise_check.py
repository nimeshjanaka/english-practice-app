"""Check a learner's answer without revealing the stored key before submit."""

from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseSubmit


def _norm(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _text_answer(correct: dict) -> str:
    answer = correct.get("answer")
    if isinstance(answer, str):
        return answer
    return ""


def _sequence(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [_norm(str(item)) for item in value]


def _pairs(value: object) -> list[tuple[str, str]]:
    if not isinstance(value, list):
        return []
    cleaned: list[tuple[str, str]] = []
    for item in value:
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            cleaned.append((_norm(str(item[0])), _norm(str(item[1]))))
    return sorted(cleaned)


def _kind(exercise_type: str) -> str:
    name = exercise_type.lower().replace("-", "_").replace(" ", "_")
    if "fill" in name:
        return "fill_blank"
    if "order" in name:
        return "sentence_ordering"
    if "match" in name or "drag" in name:
        return "matching"
    return "multiple_choice"


def evaluate_exercise(exercise: Exercise, submission: ExerciseSubmit) -> dict:
    """Return whether the submission matches the stored answer, plus the explanation."""
    correct = exercise.correct_answer or {}
    kind = _kind(exercise.type)

    if kind == "sentence_ordering":
        expected = _sequence(correct.get("order") or correct.get("answer"))
        is_correct = bool(expected) and _sequence(submission.order) == expected
    elif kind == "matching" and correct.get("pairs"):
        expected_pairs = _pairs(correct.get("pairs"))
        is_correct = bool(expected_pairs) and _pairs(submission.pairs) == expected_pairs
    else:
        expected = _norm(_text_answer(correct))
        is_correct = bool(expected) and _norm(submission.answer or "") == expected

    explanation = (exercise.explanation or exercise.feedback or "").strip()
    if not explanation:
        explanation = (
            "That's the right answer."
            if is_correct
            else "That answer does not match. Read the question and try again."
        )
    return {"is_correct": is_correct, "explanation": explanation}
