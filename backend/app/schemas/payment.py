"""Pydantic schemas for payments."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    """Payload to create a payment (from the mobile app / checkout)."""

    amount: Decimal = Field(gt=0, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=10)
    gateway_transaction_id: str | None = Field(default=None, max_length=255)


class PaymentUpdate(BaseModel):
    """Admin payload to update payment status / gateway id."""

    status: str | None = Field(default=None, min_length=1, max_length=50)
    gateway_transaction_id: str | None = Field(default=None, max_length=255)


class PaymentResponse(BaseModel):
    """Payment record as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    amount: Decimal
    currency: str
    status: str
    gateway_transaction_id: str | None
    created_at: datetime
