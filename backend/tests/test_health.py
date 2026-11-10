"""Smoke tests to verify the TestClient + SQLite fixtures work."""


def test_root_welcome(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Welcome" in data["message"]
