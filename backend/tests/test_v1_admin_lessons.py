"""Admin curriculum catalog and lesson creation."""

import json
from unittest.mock import AsyncMock, patch

import pytest

from app.models.curriculum import CefrLevel, Course
from app.models.lesson import Lesson
from app.models.unit import Unit
from app.services.ai_content import parse_exercise_json


def _seed_path(db_session) -> Lesson:
    db_session.add(CefrLevel(code="A1", name="Beginner", description="", sort_order=1))
    db_session.flush()
    course = Course(level_code="A1", title="A1 English", description="", status="published", order_index=1)
    db_session.add(course)
    db_session.flush()
    unit = Unit(title="Introducing Yourself", order_index=1, course_id=course.id, status="published")
    db_session.add(unit)
    db_session.flush()
    published = Lesson(unit_id=unit.id, title="Greetings", icon_name="wave", order_index=1, status="published")
    draft = Lesson(unit_id=unit.id, title="Hidden draft", icon_name="book", order_index=2, status="draft")
    db_session.add_all([published, draft])
    db_session.commit()
    return draft


def test_admin_courses_include_draft_lessons(client, admin_headers, user_headers, db_session):
    draft = _seed_path(db_session)

    admin_rows = client.get("/api/v1/courses", headers=admin_headers)
    assert admin_rows.status_code == 200, admin_rows.text
    lessons = admin_rows.json()[0]["lessons"]
    by_title = {item["title"]: item for item in lessons}
    assert by_title["Hidden draft"]["status"] == "draft"
    assert by_title["Hidden draft"]["unit_title"] == "Introducing Yourself"
    assert by_title["Greetings"]["status"] == "published"

    student_rows = client.get("/api/v1/courses", headers=user_headers)
    titles = [item["title"] for item in student_rows.json()[0]["lessons"]]
    assert "Hidden draft" not in titles
    assert draft.id


def test_admin_can_create_lesson(client, admin_headers, db_session):
    _seed_path(db_session)
    created = client.post(
        "/api/v1/admin/lessons",
        headers=admin_headers,
        json={"title": "Names", "unit": "Introducing Yourself", "level": "A1", "order_index": 4},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["status"] == "draft"
    assert body["unit"] == "Introducing Yourself"
    assert body["level"] == "A1"
    assert body["order_index"] == 4

    catalog = client.get("/api/v1/courses", headers=admin_headers)
    titles = [item["title"] for item in catalog.json()[0]["lessons"]]
    assert "Names" in titles


def test_student_cannot_create_lesson(client, user_headers):
    response = client.post(
        "/api/v1/admin/lessons",
        headers=user_headers,
        json={"title": "Names", "unit": "Introducing Yourself", "level": "A1", "order_index": 1},
    )
    assert response.status_code == 403


def _gpt_exercises(count: int = 10) -> str:
    kinds = ["multiple_choice", "fill_blank", "matching"]
    exercises = []
    for index in range(1, count + 1):
        kind = kinds[(index - 1) % len(kinds)]
        if kind == "matching":
            question = {"pairs": [["Hello", "A greeting"]]}
            answer = {"pairs": [["Hello", "A greeting"]]}
        elif kind == "fill_blank":
            question = {"sentence": "My name _____ Sam."}
            answer = {"answer": "is"}
        else:
            question = {"question": "Choose a greeting.", "options": ["Hi", "Bye"]}
            answer = {"answer": "Hi"}
        exercises.append(
            {
                "type": kind,
                "prompt": f"Item {index}",
                "question_data": question,
                "correct_answer": answer,
                "explanation": "Review this.",
                "status": "published",
            }
        )
    return json.dumps({"exercises": exercises})


def test_parse_exercise_json_rejects_a_bad_item():
    raw = json.dumps([{"type": "multiple_choice", "prompt": "Hi"}])
    with pytest.raises(ValueError, match="exercise schema"):
        parse_exercise_json(raw, count=1, allowed_types={"multiple_choice"}, level="A1")


@patch("app.services.ai_content.request_gpt4o_json", new_callable=AsyncMock)
def test_generate_ai_content_returns_editable_draft(mock_gpt, client, admin_headers):
    mock_gpt.return_value = _gpt_exercises()
    before = client.get("/api/admin/curriculum/lessons", headers=admin_headers)
    before_count = len(before.json())

    preview = client.post(
        "/api/v1/admin/generate-ai-content",
        headers=admin_headers,
        json={
            "level": "A2",
            "unit": "Daily routines",
            "topic": "Morning habits",
            "count": 10,
            "types": ["multiple_choice", "fill_blank", "matching"],
        },
    )
    assert preview.status_code == 200, preview.text
    draft = preview.json()
    assert draft["lesson_topic"] == "Morning habits"
    assert draft["status"] == "generated"
    assert len(draft["exercises"]) == 10

    after = client.get("/api/admin/curriculum/lessons", headers=admin_headers)
    assert len(after.json()) == before_count

    draft["exercises"][0]["prompt"] = "Edited by the reviewer"
    saved = client.post("/api/v1/admin/lessons/save", headers=admin_headers, json=draft)
    assert saved.status_code == 200, saved.text
    assert saved.json()["exercises_created"] == 10
    assert saved.json()["status"] == "generated"

    lessons = client.get("/api/admin/curriculum/lessons", headers=admin_headers)
    created = next(row for row in lessons.json() if row["title"] == "Morning habits")
    exercises = client.get(
        f"/api/admin/curriculum/exercises?lesson_id={created['id']}",
        headers=admin_headers,
    )
    assert exercises.json()[0]["prompt"] == "Edited by the reviewer"
    assert exercises.json()[0]["status"] == "generated"
    prompt = mock_gpt.await_args.args[0]
    assert "A2" in prompt
    assert "Morning habits" in prompt


def test_generate_ai_content_rejects_invalid_model_json(client, admin_headers):
    with patch("app.services.ai_content.request_gpt4o_json", new_callable=AsyncMock) as mock_gpt:
        mock_gpt.return_value = "not json"
        response = client.post(
            "/api/v1/admin/generate-ai-content",
            headers=admin_headers,
            json={
                "level_code": "A1",
                "unit_title": "Introducing Yourself",
                "lesson_topic": "Greetings",
                "exercise_count": 1,
                "exercise_types": ["multiple_choice"],
            },
        )
    assert response.status_code == 422


def test_generate_ai_content_requires_an_openai_key(client, admin_headers, monkeypatch):
    monkeypatch.setattr(
        "app.services.ai_content.get_settings",
        lambda: type("Settings", (), {"OPENAI_API_KEY": ""})(),
    )
    response = client.post(
        "/api/v1/admin/generate-ai-content",
        headers=admin_headers,
        json={
            "level_code": "A1",
            "unit_title": "Introducing Yourself",
            "lesson_topic": "Greetings",
            "exercise_count": 1,
            "exercise_types": ["multiple_choice"],
        },
    )
    assert response.status_code == 503


def test_generate_ai_content_requires_admin(client, user_headers):
    response = client.post(
        "/api/v1/admin/generate-ai-content",
        headers=user_headers,
        json={
            "level_code": "A1",
            "unit_title": "Introducing Yourself",
            "lesson_topic": "Greetings",
            "exercise_count": 10,
            "exercise_types": ["multiple_choice"],
        },
    )
    assert response.status_code == 403


def test_create_lesson_rejects_unknown_level(client, admin_headers):
    response = client.post(
        "/api/v1/admin/lessons",
        headers=admin_headers,
        json={"title": "Names", "unit": "Introducing Yourself", "level": "Z9", "order_index": 1},
    )
    assert response.status_code == 422
