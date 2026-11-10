"""Learner profile PATCH from onboarding."""


def test_patch_profile_saves_onboarding_fields(client, user_headers):
    response = client.patch(
        "/api/v1/users/me/profile",
        headers=user_headers,
        json={
            "name": "Nimesh",
            "level": "A2",
            "goals": "career",
            "preferred_voice": "nova",
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["name"] == "Nimesh"
    assert body["level"] == "A2"
    assert body["goals"] == "career"
    assert body["preferred_voice"] == "nova"

    again = client.get("/api/v1/users/me/profile", headers=user_headers)
    assert again.status_code == 200
    assert again.json()["name"] == "Nimesh"


def test_patch_profile_accepts_goal_list(client, user_headers):
    response = client.patch(
        "/api/v1/users/me/profile",
        headers=user_headers,
        json={"goals": ["career", "travel"]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["goals"] == "career, travel"


def test_patch_profile_requires_auth(client):
    response = client.patch(
        "/api/v1/users/me/profile",
        json={"name": "Guest"},
    )
    assert response.status_code == 401
