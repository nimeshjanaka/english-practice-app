"""Pydantic schemas for user auth and profile responses."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    """Payload for registering a new user."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    """Payload for logging in."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Safe user representation (never includes password_hash)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: UserRole
    created_at: datetime


class Token(BaseModel):
    """JWT access token returned after successful login/register."""

    access_token: str
    token_type: str = "bearer"
