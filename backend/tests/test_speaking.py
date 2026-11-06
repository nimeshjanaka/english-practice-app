"""Speaking session messages, with Groq mocked."""

from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.models.lesson import Lesson
from app.models.unit import Unit

MOCK_TRANSCRIPT = "My name is Sam."
MOCK_REPLY = "Nice. Better: My name is Sam."
MOCK_GRAMMAR = "Use 'is' after 'name'."


def _seed_lesson(db_session) -> Lesson:
    unit = Unit(title="Introducing Yourself", order_index=1)
    db_session.add(unit)
    db_session.flush()
    lesson = Lesson(unit_id=unit.id, title="Greetings", icon_name="wave", order_index=1)
    db_session.add(lesson)
    db_session.commit()
    db_session.refresh(lesson)
    return lesson


def _fake_tts(_client, _text: str, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(b"RIFF")


@patch("app.api.v1.endpoints.speaking.synthesize_speech", side_effect=_fake_tts)
@patch(
    "app.api.v1.endpoints.speaking.generate_tutor_reply",
    return_value={"reply": MOCK_REPLY, "grammar_correction": MOCK_GRAMMAR},
)
@patch("app.api.v1.endpoints.speaking.transcribe_audio", return_value=MOCK_TRANSCRIPT)
@patch("app.api.v1.endpoints.speaking.get_groq_client", return_value=MagicMock())
def test_speaking_message_returns_text_audio_and_correction(
    _client,
    _transcribe,
    _tutor,
    _tts,
    client,
    user_headers,
    db_session,
):
    lesson = _seed_lesson(db_session)
    opened = client.post(
        "/api/v1/speaking/sessions",
        headers=user_headers,
        json={"lesson_id": lesson.id},
    )
    assert opened.status_code == 201, opened.text
    session_id = opened.json()["id"]

    response = client.post(
        f"/api/v1/speaking/sessions/{session_id}/messages",
        headers=user_headers,
        files={"audio": ("speech.m4a", BytesIO(b"fake-audio"), "audio/mp4")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["transcript"] == MOCK_TRANSCRIPT
    assert body["reply"] == MOCK_REPLY
    assert body["grammar_correction"] == MOCK_GRAMMAR
    assert body["audio_url"].endswith(".wav")


def test_speaking_session_requires_auth(client):
    assert client.post("/api/v1/speaking/sessions", json={"lesson_id": 1}).status_code == 401


def test_speaking_session_missing_lesson_is_404(client, user_headers):
    response = client.post(
        "/api/v1/speaking/sessions",
        headers=user_headers,
        json={"lesson_id": 9999},
    )
    assert response.status_code == 404
