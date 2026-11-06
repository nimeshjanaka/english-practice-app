"""Ask GPT-4o for a lesson's exercises and check the JSON before it is shown."""

from __future__ import annotations

import json

from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from app.config import get_settings
from app.domain.content import CEFR_CODES, EXERCISE_TYPES


class AiContentError(Exception):
    """The model could not be called or did not return usable JSON."""

    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.status_code = status_code


class GeneratedExercise(BaseModel):
    """One exercise in the shape stored on the Exercise table."""

    model_config = ConfigDict(extra="ignore")

    type: str
    prompt: str = Field(min_length=1)
    question_data: dict
    correct_answer: dict
    explanation: str = ""
    feedback: str = ""
    difficulty: str = "A1"
    marks: int = Field(default=1, ge=1)
    learning_objective: str = ""
    order_index: int = Field(default=0, ge=0)
    status: str = "generated"

    @field_validator("type")
    @classmethod
    def known_type(cls, value: str) -> str:
        if value not in EXERCISE_TYPES:
            raise ValueError(f"Unsupported exercise type '{value}'")
        return value

    @field_validator("question_data", "correct_answer")
    @classmethod
    def object_payload(cls, value: dict) -> dict:
        if not isinstance(value, dict) or not value:
            raise ValueError("question_data and correct_answer must be JSON objects")
        return value


def parse_exercise_json(raw: str, *, count: int, allowed_types: set[str], level: str) -> list[GeneratedExercise]:
    """Validate the model text as a JSON array of exercises."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError("The model did not return valid JSON") from exc

    if isinstance(payload, dict):
        payload = payload.get("exercises")
    if not isinstance(payload, list):
        raise ValueError("The model did not return a JSON array of exercises")
    if len(payload) != count:
        raise ValueError(f"Expected {count} exercises and received {len(payload)}")

    exercises: list[GeneratedExercise] = []
    for index, item in enumerate(payload, start=1):
        try:
            exercise = GeneratedExercise.model_validate(item)
        except ValidationError as exc:
            raise ValueError(f"Exercise {index} does not match the exercise schema") from exc
        if exercise.type not in allowed_types:
            raise ValueError(f"Exercise {index} uses '{exercise.type}', which was not requested")
        exercise.status = "generated"
        exercise.difficulty = level
        exercise.order_index = index
        exercises.append(exercise)
    return exercises


def _prompt(level: str, unit: str, topic: str, count: int, types: list[str]) -> str:
    type_list = ", ".join(types)
    return (
        "You write English-learning exercises for adult learners. "
        f"Create exactly {count} exercises for CEFR {level}. "
        f"Unit name: {unit}. Lesson topic: {topic}. "
        f"Use only these exercise types: {type_list}. "
        "Return one JSON object with an exercises array. "
        "Each exercise must include type, prompt, question_data, correct_answer, "
        "explanation, feedback, difficulty, marks, learning_objective, order_index, and status. "
        "question_data and correct_answer are objects, never strings. "
        "For multiple_choice, put the choices in question_data.options and the right choice in correct_answer.answer. "
        "For fill_blank, put the sentence in question_data.sentence and the missing word in correct_answer.answer. "
        "For matching, put pairs in question_data.pairs and the same pairs in correct_answer.pairs. "
        "status must be generated. Do not wrap the JSON in markdown."
    )


async def request_gpt4o_json(prompt: str) -> str:
    """Call GPT-4o and return the message text. The key comes from the environment."""
    api_key = get_settings().OPENAI_API_KEY.strip()
    if not api_key:
        raise AiContentError("OPENAI_API_KEY is not set. Add it to backend/.env.", 503)
    client = AsyncOpenAI(api_key=api_key, timeout=90)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            temperature=0.4,
            max_tokens=8000,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You return JSON only."},
                {"role": "user", "content": prompt},
            ],
        )
    except Exception as exc:
        raise AiContentError("GPT-4o could not generate the lesson.", 502) from exc
    content = response.choices[0].message.content if response.choices else None
    if not content:
        raise AiContentError("GPT-4o returned an empty response.", 502)
    return content


async def generate_lesson_specification(
    level: str,
    unit: str,
    topic: str,
    count: int,
    types: list[str],
) -> dict:
    """Return a reviewable lesson draft whose exercises passed schema checks."""
    code = level.strip().upper()
    if code not in CEFR_CODES:
        raise ValueError("Level must be one of A1, A2, B1, B2, C1, C2")
    allowed = [item for item in types if item in EXERCISE_TYPES]
    if not allowed:
        raise ValueError("Choose at least one supported exercise type")
    raw = await request_gpt4o_json(_prompt(code, unit.strip(), topic.strip(), count, allowed))
    exercises = parse_exercise_json(raw, count=count, allowed_types=set(allowed), level=code)
    return {
        "level_code": code,
        "unit_title": unit.strip(),
        "lesson_topic": topic.strip(),
        "summary": "AI draft — needs human review",
        "status": "generated",
        "exercises": [item.model_dump() for item in exercises],
    }
