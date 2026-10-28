"""Pydantic schemas for learning units."""

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.lesson import LessonPathItem


class UnitCreate(BaseModel):
    """Payload to create a unit."""

    title: str = Field(min_length=1, max_length=255)
    order_index: int = 0


class UnitUpdate(BaseModel):
    """Payload to partially update a unit."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    order_index: int | None = None


class UnitResponse(BaseModel):
    """Unit as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    order_index: int


class UnitWithLessonsResponse(UnitResponse):
    """Unit with nested lessons + completion flags for the learning path."""

    lessons: list[LessonPathItem] = []
