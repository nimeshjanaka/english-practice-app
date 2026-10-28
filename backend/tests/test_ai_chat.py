"""Tests for /api/ai/chat with OpenAI calls mocked (no real API usage)."""

from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.models.lesson import Lesson
from app.models.unit import Unit

CHAT_URL = "/api/ai/chat"
REGISTER_URL = "/api/auth/register"
LOGIN_URL = "/api/auth/login"

MOCK_TRANSCRIPT = "Hello, I want to practice English."
MOCK_REPLY = "Great job! Let's keep practicing together."
MOCK_GRAMMAR = "Use 'I want to' — that sentence is already correct."


def _auth_headers(client) -> dict[str, str]:
    """Register + login and return Authorization headers."""
    user = {"email": "ai.learner@example.com", "password": "securepass123"}
    client.post(REGISTER_URL, json=user)
    login = client.post(LOGIN_URL, json=user)
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _seed_lesson(db_session) -> Lesson:
    """Insert a unit + lesson required by the chat endpoint."""
    unit = Unit(title="Greetings", order_index=1)
    db_session.add(unit)
    db_session.flush()

    lesson = Lesson(
        unit_id=unit.id,
        title="Saying Hello",
        icon_name="wave",
        order_index=1,
    )
    db_session.add(lesson)
    db_session.commit()
    db_session.refresh(lesson)
    return lesson


def _fake_synthesize_speech(_client, _text: str, output_path: Path) -> None:
    """Stand-in for OpenAI TTS — writes a tiny fake MP3 file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(b"ID3fake-mp3-content")


@patch("app.routers.ai_chat.synthesize_speech", side_effect=_fake_synthesize_speech)
@patch(
    "app.routers.ai_chat.generate_tutor_reply",
    return_value={"reply": MOCK_REPLY, "grammar_correction": MOCK_GRAMMAR},
)
@patch("app.routers.ai_chat.transcribe_audio", return_value=MOCK_TRANSCRIPT)
@patch("app.routers.ai_chat.get_openai_client", return_value=MagicMock())
def test_ai_chat_returns_reply_and_audio_url(
    _mock_client,
    mock_transcribe,
    mock_tutor,
    mock_tts,
    client,
    db_session,
):
    """
    POST /api/ai/chat accepts audio + lesson_id, runs the mocked pipeline,
    and returns JSON with reply text and an audio URL.
    """
    lesson = _seed_lesson(db_session)
    headers = _auth_headers(client)

    audio_bytes = b"fake-audio-upload-bytes"
    files = {"audio": ("speech.m4a", BytesIO(audio_bytes), "audio/mp4")}
    data = {"lesson_id": str(lesson.id)}

    response = client.post(CHAT_URL, headers=headers, data=data, files=files)

    assert response.status_code == 200
    body = response.json()

    assert body["transcript"] == MOCK_TRANSCRIPT
    assert body["reply"] == MOCK_REPLY
    assert body["grammar_correction"] == MOCK_GRAMMAR
    assert "audio_url" in body
    assert body["audio_url"].endswith(".mp3")
    assert "/static/audio/" in body["audio_url"]
    assert body["ai_talk_time_seconds"] > 0

    # Ensure OpenAI helpers were invoked (and thus real APIs were not)
    mock_transcribe.assert_called_once()
    mock_tutor.assert_called_once()
    mock_tts.assert_called_once()
