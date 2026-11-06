"""Short-lived speaking sessions. They live in memory for this process."""

from uuid import uuid4

_sessions: dict[str, dict[str, int]] = {}


def create_speaking_session(user_id: int, lesson_id: int) -> str:
    session_id = uuid4().hex
    _sessions[session_id] = {"user_id": user_id, "lesson_id": lesson_id}
    return session_id


def get_speaking_session(session_id: str) -> dict[str, int] | None:
    found = _sessions.get(session_id)
    if found is None:
        return None
    return dict(found)
