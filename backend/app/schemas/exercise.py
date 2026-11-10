"""Pydantic schemas for exercises."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ExerciseCreate(BaseModel):
    """Payload to create an exercise."""

    lesson_id: int
    type: str = Field(min_length=1, max_length=50)
    question_data: dict[str, Any]
    correct_answer: dict[str, Any]


class ExerciseUpdate(BaseModel):
    """Payload to partially update an exercise."""

    lesson_id: int | None = None
    type: str | None = Field(default=None, min_length=1, max_length=50)
    question_data: dict[str, Any] | None = None
    correct_answer: dict[str, Any] | None = None


class ExerciseResponse(BaseModel):
    """Exercise as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_id: int
    type: str
    question_data: dict[str, Any]
    correct_answer: dict[str, Any]


class ExerciseSubmit(BaseModel):
    """Learner answer. Only the fields for the current exercise type are used."""

    answer: str | None = None
    order: list[str] | None = None
    pairs: list[list[str]] | None = None


class ExerciseSubmitResult(BaseModel):
    """Result of checking an answer. The stored key is not returned."""

    is_correct: bool
    explanation: str
