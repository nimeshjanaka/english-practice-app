"""Progress tracking: attempts, lesson scores, sessions, overview."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.models.progress import ExerciseAttempt, LearningSession, LessonProgress
from app.services.progress import current_streak_days, end_learning_session


def _exercise(client, admin_headers) -> tuple[int, int]:
    unit = client.post(
        "/api/content/units",
        headers=admin_headers,
        json={"title": "Progress unit", "order_index": 0},
    ).json()
    lesson = client.post(
        "/api/content/lessons",
        headers=admin_headers,
        json={"unit_id": unit["id"], "title": "Progress lesson", "icon_name": "book", "order_index": 0},
    ).json()
    created = client.post(
        "/api/content/exercises",
        headers=admin_headers,
        json={
            "lesson_id": lesson["id"],
            "type": "multiple_choice",
            "question_data": {"question": "Hi?", "options": ["Hello", "Bye"]},
            "correct_answer": {"answer": "Hello"},
        },
    )
    assert created.status_code == 201, created.text
    return created.json()["id"], lesson["id"]


def test_attempt_updates_exercise_attempts_and_lesson_progress(
    client,
    user_headers,
    admin_headers,
    db_session,
):
    exercise_id, lesson_id = _exercise(client, admin_headers)

    wrong = client.post(
        f"/api/v1/exercises/{exercise_id}/attempts",
        headers=user_headers,
        json={"answer": "Bye"},
    )
    assert wrong.status_code == 200
    assert wrong.json()["is_correct"] is False

    progress = db_session.scalar(
        select(LessonProgress).where(LessonProgress.lesson_id == lesson_id)
    )
    assert progress is not None
    assert progress.is_completed is False
    assert progress.score == 0

    right = client.post(
        f"/api/v1/exercises/{exercise_id}/attempts",
        headers=user_headers,
        json={"answer": "Hello"},
    )
    assert right.status_code == 200
    assert right.json()["is_correct"] is True

    db_session.expire_all()
    progress = db_session.scalar(
        select(LessonProgress).where(LessonProgress.lesson_id == lesson_id)
    )
    assert progress is not None
    assert progress.is_completed is True
    assert progress.score == 100
    assert progress.exercises_correct == 1

    attempts = list(
        db_session.scalars(
            select(ExerciseAttempt).where(ExerciseAttempt.exercise_id == exercise_id)
        ).all()
    )
    assert len(attempts) == 2


def test_progress_overview_and_learning_session(client, user_headers, db_session, test_user):
    end_learning_session(
        db_session,
        user_id=test_user.id,
        session_type="speaking",
        duration_seconds=125,
        lesson_id=None,
    )

    overview = client.get("/api/v1/progress/overview", headers=user_headers)
    assert overview.status_code == 200, overview.text
    body = overview.json()
    assert body["lessons_completed"] == 0
    assert body["total_speaking_seconds"] == 125
    assert body["current_streak"] >= 1

    sessions = list(
        db_session.scalars(
            select(LearningSession).where(LearningSession.user_id == test_user.id)
        ).all()
    )
    assert len(sessions) == 1
    assert sessions[0].duration_seconds == 125


def test_close_ai_chat_session_endpoint(client, user_headers, db_session, test_user):
    response = client.post(
        "/api/v1/progress/sessions/end",
        headers=user_headers,
        json={"session_type": "ai_chat", "duration_seconds": 90, "lesson_id": None},
    )
    assert response.status_code == 200, response.text
    assert response.json()["duration_seconds"] == 90
    assert response.json()["session_type"] == "ai_chat"


def test_streak_counts_consecutive_days(db_session, test_user):
    now = datetime.now(timezone.utc)
    for days_ago in (0, 1, 2):
        end_learning_session(
            db_session,
            user_id=test_user.id,
            session_type="speaking",
            duration_seconds=30,
            started_at=now - timedelta(days=days_ago, minutes=5),
        )
    assert current_streak_days(db_session, test_user.id) == 3
