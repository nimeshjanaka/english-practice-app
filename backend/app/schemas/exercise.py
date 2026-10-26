"""Pydantic schemas for exercises."""

from typing import Any

from pydantic import BaseModel, ConfigDict


class ExerciseResponse(BaseModel):
    """Exercise as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_id: int
    type: str
    question_data: dict[str, Any]
    correct_answer: dict[str, Any]
