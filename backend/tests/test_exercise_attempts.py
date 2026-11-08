"""Attempts on /api/v1/exercises/{id}/attempts."""


def _exercise(client, admin_headers, exercise_type: str, question: dict, answer: dict) -> int:
    unit = client.post(
        "/api/content/units",
        headers=admin_headers,
        json={"title": "Practice unit", "order_index": 0},
    ).json()
    lesson = client.post(
        "/api/content/lessons",
        headers=admin_headers,
        json={"unit_id": unit["id"], "title": "Practice", "icon_name": "book", "order_index": 0},
    ).json()
    created = client.post(
        "/api/content/exercises",
        headers=admin_headers,
        json={
            "lesson_id": lesson["id"],
            "type": exercise_type,
            "question_data": question,
            "correct_answer": answer,
        },
    )
    assert created.status_code == 201, created.text
    return created.json()["id"]


def test_attempt_reports_correct_and_incorrect(client, user_headers, admin_headers):
    exercise_id = _exercise(
        client,
        admin_headers,
        "multiple_choice",
        {"question": "Morning greeting?", "options": ["Good night", "Good morning"]},
        {"answer": "Good morning"},
    )
    wrong = client.post(
        f"/api/v1/exercises/{exercise_id}/attempts",
        headers=user_headers,
        json={"answer": "Good night"},
    )
    assert wrong.status_code == 200, wrong.text
    assert wrong.json()["is_correct"] is False
    assert wrong.json()["explanation"]

    right = client.post(
        f"/api/v1/exercises/{exercise_id}/attempts",
        headers=user_headers,
        json={"answer": "good morning"},
    )
    assert right.status_code == 200
    assert right.json()["is_correct"] is True


def test_attempt_requires_auth(client):
    response = client.post("/api/v1/exercises/1/attempts", json={"answer": "Hi"})
    assert response.status_code == 401
