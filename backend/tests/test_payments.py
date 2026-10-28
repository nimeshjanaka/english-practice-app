"""Tests for /api/payments routes."""


def test_create_and_list_my_payments(client, user_headers):
    create = client.post(
        "/api/payments",
        headers=user_headers,
        json={"amount": "9.99", "currency": "usd"},
    )
    assert create.status_code == 201
    body = create.json()
    assert body["amount"] == "9.99"
    assert body["currency"] == "USD"
    assert body["status"] == "pending"

    mine = client.get("/api/payments/me", headers=user_headers)
    assert mine.status_code == 200
    assert len(mine.json()) == 1
    assert mine.json()[0]["id"] == body["id"]


def test_list_all_payments_admin_only(client, user_headers, admin_headers):
    client.post(
        "/api/payments",
        headers=user_headers,
        json={"amount": "5.00", "currency": "USD"},
    )

    forbidden = client.get("/api/payments", headers=user_headers)
    assert forbidden.status_code == 403

    allowed = client.get("/api/payments", headers=admin_headers)
    assert allowed.status_code == 200
    assert len(allowed.json()) >= 1


def test_get_payment_owner_and_admin(client, user_headers, admin_headers):
    created = client.post(
        "/api/payments",
        headers=user_headers,
        json={"amount": "12.50", "currency": "USD", "gateway_transaction_id": "tx_1"},
    ).json()
    payment_id = created["id"]

    owner = client.get(f"/api/payments/{payment_id}", headers=user_headers)
    assert owner.status_code == 200

    admin = client.get(f"/api/payments/{payment_id}", headers=admin_headers)
    assert admin.status_code == 200


def test_update_payment_admin(client, user_headers, admin_headers):
    created = client.post(
        "/api/payments",
        headers=user_headers,
        json={"amount": "20.00", "currency": "USD"},
    ).json()

    updated = client.patch(
        f"/api/payments/{created['id']}",
        headers=admin_headers,
        json={"status": "completed", "gateway_transaction_id": "gw_abc"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "completed"
    assert updated.json()["gateway_transaction_id"] == "gw_abc"


def test_get_missing_payment(client, user_headers):
    response = client.get("/api/payments/9999", headers=user_headers)
    assert response.status_code == 404


def test_cannot_view_another_users_payment(client, user_headers, admin_headers):
    # Admin creates... actually learner A creates; learner B cannot view
    created = client.post(
        "/api/payments",
        headers=user_headers,
        json={"amount": "3.00", "currency": "USD"},
    ).json()

    other = client.post(
        "/api/auth/register",
        json={"email": "other@example.com", "password": "securepass123"},
    )
    assert other.status_code == 201
    login = client.post(
        "/api/auth/login",
        json={"email": "other@example.com", "password": "securepass123"},
    )
    other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    forbidden = client.get(f"/api/payments/{created['id']}", headers=other_headers)
    assert forbidden.status_code == 403


def test_update_missing_payment(client, admin_headers):
    response = client.patch(
        "/api/payments/9999",
        headers=admin_headers,
        json={"status": "failed"},
    )
    assert response.status_code == 404
