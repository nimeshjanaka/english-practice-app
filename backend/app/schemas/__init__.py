"""Pydantic request/response schemas."""

from app.schemas.ai_chat import ChatResponse
from app.schemas.exercise import ExerciseCreate, ExerciseResponse, ExerciseUpdate
from app.schemas.lesson import LessonCreate, LessonPathItem, LessonResponse, LessonUpdate
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentUpdate
from app.schemas.unit import UnitCreate, UnitResponse, UnitUpdate, UnitWithLessonsResponse
from app.schemas.user import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    GoogleAuthRequest,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
)

__all__ = [
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "Token",
    "GoogleAuthRequest",
    "ForgotPasswordRequest",
    "ForgotPasswordResponse",
    "ResetPasswordRequest",
    "UnitCreate",
    "UnitUpdate",
    "UnitResponse",
    "UnitWithLessonsResponse",
    "LessonCreate",
    "LessonUpdate",
    "LessonResponse",
    "LessonPathItem",
    "ExerciseCreate",
    "ExerciseUpdate",
    "ExerciseResponse",
    "PaymentCreate",
    "PaymentUpdate",
    "PaymentResponse",
    "ChatResponse",
]
