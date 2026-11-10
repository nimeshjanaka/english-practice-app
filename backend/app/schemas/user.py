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


class GoogleAuthRequest(BaseModel):
    """Google ID token from the mobile Expo AuthSession flow."""

    id_token: str = Field(min_length=20)


class ForgotPasswordRequest(BaseModel):
    """Request a password-reset token for an email."""

    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """Forgot-password result (may include reset_token in DEBUG_AUTH mode)."""

    message: str
    reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    """Set a new password using a reset token."""

    token: str
    new_password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    """Safe user representation (never includes password_hash)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: UserRole
    created_at: datetime


class UserProfileUpdate(BaseModel):
    """Onboarding fields the mobile app can patch after signup."""

    name: str | None = Field(default=None, max_length=120)
    level: str | None = Field(default=None, max_length=16)
    goals: str | list[str] | None = None
    preferred_voice: str | None = Field(default=None, max_length=64)


class UserProfileResponse(BaseModel):
    """Saved onboarding profile."""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    name: str
    level: str
    goals: str
    preferred_voice: str
    updated_at: datetime


class Token(BaseModel):
    """JWT access token returned after successful login/register."""

    access_token: str
    token_type: str = "bearer"
