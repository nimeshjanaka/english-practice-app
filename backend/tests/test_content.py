"""Admin CRUD tests for /api/content (units, lessons, exercises)."""


def test_list_units_available_to_learners(client, user_headers, admin_headers):
    """Authenticated learners can fetch the learning-path units list."""
    client.post(
        "/api/content/units",
        headers=admin_headers,
        json={"title": "Starter", "order_index": 0},
    )
    response = client.get("/api/content/units", headers=user_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert "lessons" in response.json()[0]


def test_content_mutations_require_admin(client, user_headers):
    response = client.post(
        "/api/content/units",
        headers=user_headers,
        json={"title": "Nope", "order_index": 0},
    )
    assert response.status_code == 403


def test_unit_crud(client, admin_headers):
    # Create
    create = client.post(
        "/api/content/units",
        headers=admin_headers,
        json={"title": "Unit 1", "order_index": 1},
    )
    assert create.status_code == 201
    unit_id = create.json()["id"]
    assert create.json()["title"] == "Unit 1"

    # List
    listed = client.get("/api/content/units", headers=admin_headers)
    assert listed.status_code == 200
    assert any(u["id"] == unit_id for u in listed.json())

    # Get
    got = client.get(f"/api/content/units/{unit_id}", headers=admin_headers)
    assert got.status_code == 200
    assert got.json()["title"] == "Unit 1"

    # Update
    patched = client.patch(
        f"/api/content/units/{unit_id}",
        headers=admin_headers,
        json={"title": "Unit 1 Updated"},
    )
    assert patched.status_code == 200
    assert patched.json()["title"] == "Unit 1 Updated"

    # Delete
    deleted = client.delete(f"/api/content/units/{unit_id}", headers=admin_headers)
    assert deleted.status_code == 204

    missing = client.get(f"/api/content/units/{unit_id}", headers=admin_headers)
    assert missing.status_code == 404


def test_lesson_and_exercise_crud(client, admin_headers):
    unit = client.post(
        "/api/content/units",
        headers=admin_headers,
        json={"title": "Greetings", "order_index": 0},
    ).json()

    # Lesson create
    lesson_res = client.post(
        "/api/content/lessons",
        headers=admin_headers,
        json={
            "unit_id": unit["id"],
            "title": "Hello",
            "icon_name": "wave",
            "order_index": 1,
        },
    )
    assert lesson_res.status_code == 201
    lesson_id = lesson_res.json()["id"]

    # Lesson list / get / patch
    assert client.get("/api/content/lessons", headers=admin_headers).status_code == 200
    assert client.get(f"/api/content/lessons/{lesson_id}", headers=admin_headers).status_code == 200
    patched_lesson = client.patch(
        f"/api/content/lessons/{lesson_id}",
        headers=admin_headers,
        json={"title": "Hello Again"},
    )
    assert patched_lesson.status_code == 200
    assert patched_lesson.json()["title"] == "Hello Again"

    # Exercise create
    exercise_res = client.post(
        "/api/content/exercises",
        headers=admin_headers,
        json={
            "lesson_id": lesson_id,
            "type": "fill_blank",
            "question_data": {"prompt": "I ___ happy"},
            "correct_answer": {"answer": "am"},
        },
    )
    assert exercise_res.status_code == 201
    exercise_id = exercise_res.json()["id"]

    assert client.get("/api/content/exercises", headers=admin_headers).status_code == 200
    assert (
        client.get(f"/api/content/exercises/{exercise_id}", headers=admin_headers).status_code
        == 200
    )
    patched_ex = client.patch(
        f"/api/content/exercises/{exercise_id}",
        headers=admin_headers,
        json={"type": "multiple_choice"},
    )
    assert patched_ex.status_code == 200
    assert patched_ex.json()["type"] == "multiple_choice"

    # Delete exercise, then lesson
    assert (
        client.delete(f"/api/content/exercises/{exercise_id}", headers=admin_headers).status_code
        == 204
    )
    assert (
        client.delete(f"/api/content/lessons/{lesson_id}", headers=admin_headers).status_code == 204
    )


def test_create_lesson_for_missing_unit(client, admin_headers):
    response = client.post(
        "/api/content/lessons",
        headers=admin_headers,
        json={"unit_id": 9999, "title": "Orphan", "icon_name": "book", "order_index": 0},
    )
    assert response.status_code == 404


def test_missing_resources_return_404(client, admin_headers):
    assert client.get("/api/content/units/9999", headers=admin_headers).status_code == 404
    assert client.patch("/api/content/units/9999", headers=admin_headers, json={"title": "x"}).status_code == 404
    assert client.delete("/api/content/units/9999", headers=admin_headers).status_code == 404
    assert client.get("/api/content/lessons/9999", headers=admin_headers).status_code == 404
    assert client.patch("/api/content/lessons/9999", headers=admin_headers, json={"title": "x"}).status_code == 404
    assert client.delete("/api/content/lessons/9999", headers=admin_headers).status_code == 404
    assert client.get("/api/content/exercises/9999", headers=admin_headers).status_code == 404
    assert (
        client.patch("/api/content/exercises/9999", headers=admin_headers, json={"type": "x"}).status_code
        == 404
    )
    assert client.delete("/api/content/exercises/9999", headers=admin_headers).status_code == 404


def test_create_exercise_for_missing_lesson(client, admin_headers):
    response = client.post(
        "/api/content/exercises",
        headers=admin_headers,
        json={
            "lesson_id": 9999,
            "type": "fill_blank",
            "question_data": {"prompt": "x"},
            "correct_answer": {"answer": "y"},
        },
    )
    assert response.status_code == 404


def test_list_lesson_exercises_for_learner(client, user_headers, admin_headers):
    unit = client.post(
        "/api/content/units",
        headers=admin_headers,
        json={"title": "Unit A", "order_index": 0},
    ).json()
    lesson = client.post(
        "/api/content/lessons",
        headers=admin_headers,
        json={
            "unit_id": unit["id"],
            "title": "Lesson A",
            "icon_name": "book",
            "order_index": 0,
        },
    ).json()
    client.post(
        "/api/content/exercises",
        headers=admin_headers,
        json={
            "lesson_id": lesson["id"],
            "type": "fill-in-the-blank",
            "question_data": {"prompt": "I ___ happy"},
            "correct_answer": {"answer": "am"},
        },
    )

    response = client.get(
        f"/api/content/lessons/{lesson['id']}/exercises",
        headers=user_headers,
    )
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["type"] == "fill-in-the-blank"
