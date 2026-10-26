"""Pydantic schemas for payments."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


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
