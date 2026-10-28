"""Pydantic schemas for lessons."""

from pydantic import BaseModel, ConfigDict, Field


class LessonCreate(BaseModel):
    """Payload to create a lesson."""

    unit_id: int
    title: str = Field(min_length=1, max_length=255)
    icon_name: str = Field(default="book", max_length=100)
    order_index: int = 0


class LessonUpdate(BaseModel):
    """Payload to partially update a lesson."""

    unit_id: int | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    icon_name: str | None = Field(default=None, max_length=100)
    order_index: int | None = None


class LessonResponse(BaseModel):
    """Lesson as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    unit_id: int
    title: str
    icon_name: str
    order_index: int
