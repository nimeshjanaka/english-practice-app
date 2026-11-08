"""Upsert the learner's onboarding profile."""

from sqlalchemy.orm import Session

from app.models.user_profile import UserProfile


def upsert_user_profile(
    db: Session,
    user_id: int,
    *,
    name: str | None = None,
    level: str | None = None,
    goals: str | None = None,
    preferred_voice: str | None = None,
) -> UserProfile:
    """Create or update the profile row for this user."""
    profile = db.get(UserProfile, user_id)
    if profile is None:
        profile = UserProfile(user_id=user_id)
        db.add(profile)

    if name is not None:
        profile.name = name.strip()
    if level is not None:
        profile.level = level.strip()
    if goals is not None:
        profile.goals = goals.strip()
    if preferred_voice is not None:
        profile.preferred_voice = preferred_voice.strip()

    db.commit()
    db.refresh(profile)
    return profile
