"""Versioned learner profile routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.user import UserProfileResponse, UserProfileUpdate
from app.services.user_profile import upsert_user_profile

router = APIRouter()


def _goals_text(value: str | list[str] | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, list):
        return ", ".join(item.strip() for item in value if str(item).strip())
    return value


@router.patch("/me/profile", response_model=UserProfileResponse)
def update_my_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    """Save name, level, goals, and preferred voice from onboarding."""
    return upsert_user_profile(
        db,
        current_user.id,
        name=payload.name,
        level=payload.level,
        goals=_goals_text(payload.goals),
        preferred_voice=payload.preferred_voice,
    )


@router.get("/me/profile", response_model=UserProfileResponse)
def read_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    """Return the saved profile, creating an empty row if needed."""
    profile = db.get(UserProfile, current_user.id)
    if profile is None:
        return upsert_user_profile(db, current_user.id)
    return profile
