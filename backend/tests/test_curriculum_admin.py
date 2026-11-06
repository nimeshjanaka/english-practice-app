"""Curriculum CMS workflow."""

def test_bootstrap_and_publish_flow(client, admin_headers):
    denied = client.get("/api/admin/curriculum/overview")
    assert denied.status_code == 401

    boot = client.post("/api/admin/curriculum/bootstrap", headers=admin_headers)
    assert boot.status_code == 200, boot.text
    body = boot.json()
    assert body["unit_id"]
    assert body["lessons_created"] == 10

    lessons = client.get("/api/admin/curriculum/lessons", headers=admin_headers)
    assert lessons.status_code == 200
    greetings = next(row for row in lessons.json() if row["title"] == "Greetings")
    assert greetings["status"] == "draft"

    published = client.post(
        "/api/admin/curriculum/status",
        headers=admin_headers,
        json={
            "entity_type": "lessons",
            "entity_id": greetings["id"],
            "status": "published",
            "note": "Reviewed greetings lesson",
        },
    )
    assert published.status_code == 200
    assert published.json()["status"] == "published"

    exercise = client.post(
        "/api/admin/curriculum/exercises",
        headers=admin_headers,
        json={
            "lesson_id": greetings["id"],
            "type": "multiple_choice",
            "prompt": "What do you say in the morning?",
            "question_data": {
                "options": ["Good night", "Good morning", "Goodbye", "See you"]
            },
            "correct_answer": {"answer": "Good morning"},
            "explanation": "Morning greeting.",
            "status": "draft",
        },
    )
    assert exercise.status_code == 201, exercise.text
    assert exercise.json()["status"] == "draft"

    generated = client.post(
        "/api/admin/curriculum/ai/generate-lesson",
        headers=admin_headers,
        json={
            "level_code": "A1",
            "unit_title": "Introducing Yourself",
            "lesson_topic": "Greetings drill",
            "exercise_count": 3,
            "exercise_types": ["multiple_choice", "true_false"],
        },
    )
    assert generated.status_code == 200, generated.text
    assert generated.json()["status"] == "generated"
    assert generated.json()["exercises_created"] == 3


def test_preview_does_not_save_and_edited_draft_can_be_stored(client, admin_headers):
    before = client.get("/api/admin/curriculum/lessons", headers=admin_headers)
    assert before.status_code == 200
    before_count = len(before.json())

    preview = client.post(
        "/api/admin/curriculum/ai/preview-lesson",
        headers=admin_headers,
        json={
            "level_code": "A2",
            "unit_title": "Daily routines",
            "lesson_topic": "Morning habits",
            "exercise_count": 10,
            "exercise_types": ["multiple_choice", "fill_blank"],
        },
    )
    assert preview.status_code == 200, preview.text
    draft = preview.json()
    assert draft["status"] == "generated"
    assert len(draft["exercises"]) == 10
    assert draft["exercises"][0]["type"] == "multiple_choice"

    after_preview = client.get("/api/admin/curriculum/lessons", headers=admin_headers)
    assert len(after_preview.json()) == before_count

    draft["exercises"][0]["prompt"] = "Edited by the reviewer"
    saved = client.post("/api/admin/curriculum/ai/save-draft", headers=admin_headers, json=draft)
    assert saved.status_code == 200, saved.text
    assert saved.json()["exercises_created"] == 10
    assert saved.json()["status"] == "generated"

    lessons = client.get("/api/admin/curriculum/lessons", headers=admin_headers)
    created = next(row for row in lessons.json() if row["title"] == "Morning habits")
    assert created["status"] == "generated"
    exercises = client.get(
        f"/api/admin/curriculum/exercises?lesson_id={created['id']}",
        headers=admin_headers,
    )
    assert exercises.status_code == 200
    assert exercises.json()[0]["prompt"] == "Edited by the reviewer"


def test_preview_rejects_unknown_exercise_type(client, admin_headers):
    response = client.post(
        "/api/admin/curriculum/ai/preview-lesson",
        headers=admin_headers,
        json={
            "level_code": "A1",
            "unit_title": "Introducing Yourself",
            "lesson_topic": "Greetings",
            "exercise_count": 10,
            "exercise_types": ["not_a_type"],
        },
    )
    assert response.status_code == 422


def test_preview_requires_admin(client, user_headers):
    response = client.post(
        "/api/admin/curriculum/ai/preview-lesson",
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


def test_existing_content_route_still_requires_auth(client):
    response = client.get("/api/content/units")
    assert response.status_code == 401
