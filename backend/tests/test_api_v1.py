"""Versioned auth aliases and learner curriculum reads."""

from sqlalchemy import select

from app.models.curriculum import CefrLevel, Course
from app.models.exercise import Exercise
from app.models.lesson import Lesson
from app.models.unit import Unit
from app.models.user import User
from app.models.user_progress import UserProgress


def test_v1_register_and_login(client):
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "student@example.com", "password": "securepass123"},
    )
    assert registered.status_code == 201
    assert registered.json()["token_type"] == "bearer"

    logged_in = client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "securepass123"},
    )
    assert logged_in.status_code == 200
    token = logged_in.json()["access_token"]

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["role"] == "user"
    assert me.json()["email"] == "student@example.com"


def test_v1_courses_require_auth(client):
    assert client.get("/api/v1/courses").status_code == 401


def test_v1_lists_visible_courses_and_lesson_with_exercises(client, user_headers, db_session):
    db_session.add(CefrLevel(code="A1", name="Beginner", description="", sort_order=1))
    db_session.flush()
    published = Course(
        level_code="A1",
        title="A1 English",
        description="Intro",
        status="published",
        order_index=1,
    )
    draft = Course(
        level_code="A1",
        title="Hidden draft",
        description="",
        status="draft",
        order_index=2,
    )
    db_session.add_all([published, draft])
    db_session.flush()

    unit = Unit(title="Introducing Yourself", order_index=1, course_id=published.id, status="published")
    db_session.add(unit)
    db_session.flush()
    lesson = Lesson(
        unit_id=unit.id,
        title="Greetings",
        icon_name="wave",
        order_index=1,
        summary="Say hello",
        status="published",
    )
    db_session.add(lesson)
    db_session.flush()
    db_session.add(
        Exercise(
            lesson_id=lesson.id,
            type="drag-drop-match",
            question_data={"prompt": "Match the greeting", "options": ["Hello"]},
            correct_answer={"answer": "Hello"},
            status="published",
            order_index=1,
        )
    )
    db_session.add(
        Exercise(
            lesson_id=lesson.id,
            type="multiple_choice",
            question_data={"prompt": "Draft only"},
            correct_answer={"answer": "No"},
            status="draft",
            order_index=2,
        )
    )
    db_session.commit()

    courses = client.get("/api/v1/courses", headers=user_headers)
    assert courses.status_code == 200
    titles = [item["title"] for item in courses.json()]
    assert titles == ["A1 English"]
    assert courses.json()[0]["lessons"][0]["title"] == "Greetings"
    assert courses.json()[0]["lessons"][0]["is_completed"] is False

    detail = client.get(f"/api/v1/lessons/{lesson.id}", headers=user_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["title"] == "Greetings"
    assert body["summary"] == "Say hello"
    assert len(body["exercises"]) == 1
    assert body["exercises"][0]["question_data"]["prompt"] == "Match the greeting"


def test_course_path_marks_completed_lessons(client, user_headers, db_session):
    db_session.add(CefrLevel(code="A1", name="Beginner", description="", sort_order=1))
    db_session.flush()
    course = Course(level_code="A1", title="A1 English", description="", status="published", order_index=1)
    db_session.add(course)
    db_session.flush()
    unit = Unit(title="Introducing Yourself", order_index=1, course_id=course.id, status="published")
    db_session.add(unit)
    db_session.flush()
    done = Lesson(unit_id=unit.id, title="Greetings", icon_name="wave", order_index=1, status="published")
    locked = Lesson(unit_id=unit.id, title="Introductions", icon_name="users", order_index=2, status="published")
    hidden = Lesson(unit_id=unit.id, title="Draft only", icon_name="book", order_index=3, status="draft")
    db_session.add_all([done, locked, hidden])
    db_session.flush()
    learner = db_session.scalar(select(User).where(User.email == "learner@example.com"))
    assert learner is not None
    db_session.add(UserProgress(user_id=learner.id, lesson_id=done.id, is_completed=True))
    db_session.commit()

    response = client.get("/api/v1/courses", headers=user_headers)
    assert response.status_code == 200
    titles = [(row["title"], row["is_completed"]) for row in response.json()[0]["lessons"]]
    assert titles == [("Greetings", True), ("Introductions", False)]


def test_v1_missing_lesson_is_404(client, user_headers):
    response = client.get("/api/v1/lessons/9999", headers=user_headers)
    assert response.status_code == 404


def test_existing_auth_route_still_registers(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "legacy@example.com", "password": "securepass123"},
    )
    assert response.status_code == 201
