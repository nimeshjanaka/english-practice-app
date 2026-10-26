"""Pydantic schemas for learning units."""

from pydantic import BaseModel, ConfigDict


class UnitResponse(BaseModel):
    """Unit as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    order_index: int
