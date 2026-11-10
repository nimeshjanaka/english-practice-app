"""Progress overview schemas for the Profile screen."""

from pydantic import BaseModel, Field


class ProgressOverview(BaseModel):
    lessons_completed: int = Field(ge=0)
    total_speaking_seconds: int = Field(ge=0)
    current_streak: int = Field(ge=0)


class LearningSessionEnd(BaseModel):
    """Client reports that a practice session has finished."""

    lesson_id: int | None = None
    duration_seconds: int = Field(default=0, ge=0)
    session_type: str = Field(default="ai_chat", min_length=1, max_length=32)


class LearningSessionOut(BaseModel):
    id: int
    session_type: str
    duration_seconds: int
    lesson_id: int | None = None
