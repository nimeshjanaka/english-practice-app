"""
Shared Pytest fixtures for the FastAPI backend.

Uses an in-memory SQLite database so tests never touch PostgreSQL.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Import models so Base.metadata is fully populated before create_all()
import app.models  # noqa: F401
from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole

# Shared in-memory SQLite (StaticPool keeps one connection so the DB persists
# for the life of the TestClient request cycle)
SQLALCHEMY_TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """Create a fresh schema for each test, then tear it down."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """
    FastAPI TestClient wired to the in-memory SQLite session.

    Overrides `get_db` so route handlers never use the real PostgreSQL engine.
    """

    def override_get_db() -> Generator[Session, None, None]:
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _register_and_login(
    client: TestClient,
    email: str,
    password: str = "securepass123",
) -> dict[str, str]:
    """Register (ignore conflict) + login; return Authorization headers."""
    client.post("/api/auth/register", json={"email": email, "password": password})
    login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def user_headers(client: TestClient) -> dict[str, str]:
    """Auth headers for a normal learner account."""
    return _register_and_login(client, "learner@example.com")


@pytest.fixture()
def admin_headers(client: TestClient, db_session: Session) -> dict[str, str]:
    """Auth headers for an admin account."""
    email = "admin@example.com"
    password = "securepass123"
    client.post("/api/auth/register", json={"email": email, "password": password})

    user = db_session.scalar(select(User).where(User.email == email))
    assert user is not None
    user.role = UserRole.ADMIN
    db_session.commit()

    login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}
