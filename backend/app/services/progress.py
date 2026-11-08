"""Record exercise scores, lesson completion, and timed learning sessions."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.progress import ExerciseAttempt, LearningSession, LessonProgress
from app.models.user_progress import UserProgress
from app.schemas.exercise import ExerciseSubmit


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def record_exercise_attempt(
    db: Session,
    *,
    user_id: int,
    exercise: Exercise,
    submission: ExerciseSubmit,
    is_correct: bool,
) -> tuple[ExerciseAttempt, LessonProgress]:
    """Save the attempt, recalculate lesson score, and sync path completion."""
    marks = max(1, int(exercise.marks or 1))
    score = float(marks if is_correct else 0)

    attempt = ExerciseAttempt(
        user_id=user_id,
        exercise_id=exercise.id,
        lesson_id=exercise.lesson_id,
        is_correct=is_correct,
        score=score,
        answer_payload={
            "answer": submission.answer,
            "order": submission.order,
            "pairs": submission.pairs,
        },
    )
    db.add(attempt)
    db.flush()

    progress = refresh_lesson_progress(db, user_id=user_id, lesson_id=exercise.lesson_id)
    db.commit()
    db.refresh(attempt)
    db.refresh(progress)
    return attempt, progress


def refresh_lesson_progress(db: Session, *, user_id: int, lesson_id: int) -> LessonProgress:
    """Recompute score from correct unique exercises vs lesson exercise count."""
    total = db.scalar(
        select(func.count()).select_from(Exercise).where(Exercise.lesson_id == lesson_id)
    ) or 0

    correct = db.scalar(
        select(func.count(distinct(ExerciseAttempt.exercise_id))).where(
            ExerciseAttempt.user_id == user_id,
            ExerciseAttempt.lesson_id == lesson_id,
            ExerciseAttempt.is_correct.is_(True),
        )
    ) or 0

    score = round((correct / total) * 100.0, 2) if total else 0.0
    is_completed = total > 0 and correct >= total

    progress = db.scalar(
        select(LessonProgress).where(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id == lesson_id,
        )
    )
    if progress is None:
        progress = LessonProgress(user_id=user_id, lesson_id=lesson_id)
        db.add(progress)

    progress.exercises_total = int(total)
    progress.exercises_correct = int(correct)
    progress.score = score
    progress.is_completed = is_completed
    progress.updated_at = _utcnow()

    # Keep the older path table in sync for the learning-path UI.
    path = db.scalar(
        select(UserProgress).where(
            UserProgress.user_id == user_id,
            UserProgress.lesson_id == lesson_id,
        )
    )
    if path is None:
        path = UserProgress(user_id=user_id, lesson_id=lesson_id, ai_talk_time_seconds=0)
        db.add(path)
    path.is_completed = is_completed
    path.score = score

    return progress


def end_learning_session(
    db: Session,
    *,
    user_id: int,
    session_type: str,
    duration_seconds: int | None = None,
    lesson_id: int | None = None,
    speaking_session_id: str | None = None,
    started_at: datetime | None = None,
) -> LearningSession:
    """Persist total time for a finished speaking or AI chat session."""
    now = _utcnow()
    start = started_at or now
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)

    if duration_seconds is None:
        duration_seconds = max(0, int((now - start).total_seconds()))
    duration_seconds = max(0, int(duration_seconds))

    # Prefer server-side duration when a speaking session start time is known.
    if speaking_session_id and duration_seconds == 0 and started_at is not None:
        duration_seconds = max(0, int((now - start).total_seconds()))

    # Keep ended_at aligned with the practice window so streaks use the right day.
    ended = start + timedelta(seconds=duration_seconds) if started_at is not None else now
    if ended > now:
        ended = now

    row = LearningSession(
        user_id=user_id,
        lesson_id=lesson_id,
        session_type=session_type,
        duration_seconds=duration_seconds,
        speaking_session_id=speaking_session_id,
        started_at=start,
        ended_at=ended,
    )
    db.add(row)

    if lesson_id is not None and duration_seconds > 0:
        path = db.scalar(
            select(UserProgress).where(
                UserProgress.user_id == user_id,
                UserProgress.lesson_id == lesson_id,
            )
        )
        if path is None:
            path = UserProgress(user_id=user_id, lesson_id=lesson_id, ai_talk_time_seconds=0)
            db.add(path)
        path.ai_talk_time_seconds += duration_seconds

    db.commit()
    db.refresh(row)
    return row


def _activity_dates(db: Session, user_id: int) -> set[date]:
    attempt_days = db.scalars(
        select(func.date(ExerciseAttempt.created_at)).where(ExerciseAttempt.user_id == user_id)
    ).all()
    session_days = db.scalars(
        select(func.date(LearningSession.ended_at)).where(LearningSession.user_id == user_id)
    ).all()
    days: set[date] = set()
    for value in (*attempt_days, *session_days):
        if value is None:
            continue
        if isinstance(value, datetime):
            days.add(value.date())
        elif isinstance(value, date):
            days.add(value)
        else:
            days.add(date.fromisoformat(str(value)))
    return days


def current_streak_days(db: Session, user_id: int) -> int:
    """Count consecutive active days ending today or yesterday."""
    days = _activity_dates(db, user_id)
    if not days:
        return 0

    today = _utcnow().date()
    cursor = today if today in days else today - timedelta(days=1)
    if cursor not in days:
        return 0

    streak = 0
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def progress_overview(db: Session, user_id: int) -> dict:
    """Aggregate stats for the Profile screen."""
    lessons_completed = db.scalar(
        select(func.count()).select_from(LessonProgress).where(
            LessonProgress.user_id == user_id,
            LessonProgress.is_completed.is_(True),
        )
    ) or 0

    speaking_seconds = db.scalar(
        select(func.coalesce(func.sum(LearningSession.duration_seconds), 0)).where(
            LearningSession.user_id == user_id,
            LearningSession.session_type.in_(("speaking", "ai_chat")),
        )
    ) or 0

    return {
        "lessons_completed": int(lessons_completed),
        "total_speaking_seconds": int(speaking_seconds),
        "current_streak": current_streak_days(db, user_id),
    }
