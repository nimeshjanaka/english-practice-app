"""Pydantic schemas for lessons."""

from pydantic import BaseModel, ConfigDict


class LessonResponse(BaseModel):
    """Lesson as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    unit_id: int
    title: str
    icon_name: str
    order_index: int
