"""Tests for /api/users routes."""


def test_users_me(client, user_headers):
    response = client.get("/api/users/me", headers=user_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "learner@example.com"
    assert response.json()["role"] == "user"


def test_list_users_forbidden_for_normal_user(client, user_headers):
    response = client.get("/api/users", headers=user_headers)
    assert response.status_code == 403


def test_list_users_ok_for_admin(client, user_headers, admin_headers):
    response = client.get("/api/users", headers=admin_headers)
    assert response.status_code == 200
    emails = {u["email"] for u in response.json()}
    assert "learner@example.com" in emails
    assert "admin@example.com" in emails
