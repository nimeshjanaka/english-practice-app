"""Admin routes for AI lesson drafts."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import AliasChoices, BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin
from app.models.user import User
from app.schemas.curriculum import LessonDraft
from app.services.ai_content import AiContentError, generate_lesson_specification
from app.services.lesson_draft import save_lesson_draft

router = APIRouter()


class GenerateAiContentRequest(BaseModel):
    """Form fields from the AI generator. The admin panel may send either name."""

    level: str = Field(validation_alias=AliasChoices("level", "level_code"), default="A1")
    unit: str = Field(validation_alias=AliasChoices("unit", "unit_title"), min_length=1, max_length=255)
    topic: str = Field(validation_alias=AliasChoices("topic", "lesson_topic"), min_length=1, max_length=255)
    count: int = Field(validation_alias=AliasChoices("count", "exercise_count"), ge=1, le=30)
    types: list[str] = Field(validation_alias=AliasChoices("types", "exercise_types"), min_length=1)


@router.post("/generate-ai-content", response_model=LessonDraft)
async def generate_ai_content(
    payload: GenerateAiContentRequest,
    _admin: User = Depends(get_current_admin),
) -> dict:
    """Ask GPT-4o for exercises, validate them, and return the draft JSON."""
    try:
        return await generate_lesson_specification(
            payload.level,
            payload.unit,
            payload.topic,
            payload.count,
            payload.types,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except AiContentError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.post("/lessons/save")
def save_approved_lesson(
    payload: LessonDraft,
    _admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Save the approved draft. It stays generated until a reviewer publishes it."""
    try:
        return save_lesson_draft(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
