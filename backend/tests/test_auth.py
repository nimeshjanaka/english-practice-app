"""Tests for /api/auth register, login, forgot/reset, and /me."""

REGISTER_URL = "/api/auth/register"
LOGIN_URL = "/api/auth/login"
FORGOT_URL = "/api/auth/forgot-password"
RESET_URL = "/api/auth/reset-password"
ME_URL = "/api/auth/me"

SAMPLE_USER = {
    "email": "learner@example.com",
    "password": "securepass123",
}


def test_register_new_user(client):
    """Registering returns a JWT access token (auto sign-in)."""
    response = client.post(REGISTER_URL, json=SAMPLE_USER)

    assert response.status_code == 201
    data = response.json()
    assert data["access_token"]
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client):
    """Registering the same email twice should return 400."""
    client.post(REGISTER_URL, json=SAMPLE_USER)
    response = client.post(REGISTER_URL, json=SAMPLE_USER)

    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_login_with_correct_credentials(client):
    """Logging in with valid credentials should return a JWT access token."""
    client.post(REGISTER_URL, json=SAMPLE_USER)

    response = client.post(
        LOGIN_URL,
        json={
            "email": SAMPLE_USER["email"],
            "password": SAMPLE_USER["password"],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["access_token"]
    assert data["token_type"] == "bearer"


def test_login_with_wrong_password(client):
    """Logging in with a wrong password should return 401 Unauthorized."""
    client.post(REGISTER_URL, json=SAMPLE_USER)

    response = client.post(
        LOGIN_URL,
        json={
            "email": SAMPLE_USER["email"],
            "password": "wrong-password",
        },
    )

    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_forgot_and_reset_password(client):
    client.post(REGISTER_URL, json=SAMPLE_USER)

    forgot = client.post(FORGOT_URL, json={"email": SAMPLE_USER["email"]})
    assert forgot.status_code == 200
    token = forgot.json().get("reset_token")
    assert token

    reset = client.post(
        RESET_URL,
        json={"token": token, "new_password": "newsecurepass1"},
    )
    assert reset.status_code == 200
    assert reset.json()["access_token"]

    # Old password fails
    old = client.post(
        LOGIN_URL,
        json={"email": SAMPLE_USER["email"], "password": SAMPLE_USER["password"]},
    )
    assert old.status_code == 401

    # New password works
    new = client.post(
        LOGIN_URL,
        json={"email": SAMPLE_USER["email"], "password": "newsecurepass1"},
    )
    assert new.status_code == 200


def test_me_requires_auth(client):
    """Calling /me without a token should return 401/403."""
    response = client.get(ME_URL)
    assert response.status_code in (401, 403)


def test_me_with_invalid_token(client):
    """Calling /me with a junk JWT should return 401."""
    response = client.get(ME_URL, headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_me_with_valid_token(client, user_headers):
    """Calling /me with a valid JWT should return the current user."""
    response = client.get(ME_URL, headers=user_headers)
    assert response.status_code == 200
    assert response.json()["email"] == SAMPLE_USER["email"]
