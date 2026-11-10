"""AI Speaking endpoints — Groq STT/chat/TTS are mocked."""

from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

from sqlalchemy import select

from app.models.lesson import Lesson
from app.models.progress import LearningSession
from app.models.speaking import SpeakingMessage
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


def _open_session(client, user_headers, lesson_id: int) -> str:
    opened = client.post(
        "/api/v1/speaking/sessions",
        headers=user_headers,
        json={"lesson_id": lesson_id},
    )
    assert opened.status_code == 201, opened.text
    return opened.json()["session_id"]


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
    session_id = _open_session(client, user_headers, lesson.id)

    response = client.post(
        f"/api/v1/speaking/sessions/{session_id}/messages",
        headers=user_headers,
        files={"audio": ("speech.m4a", BytesIO(b"fake-audio"), "audio/mp4")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["user_transcript"] == MOCK_TRANSCRIPT
    assert body["ai_reply_text"] == MOCK_REPLY
    assert body["grammar_correction"] == MOCK_GRAMMAR
    assert body["ai_audio_url"].endswith(".wav")

    saved = list(
        db_session.scalars(
            select(SpeakingMessage).where(SpeakingMessage.session_id == session_id)
        ).all()
    )
    assert len(saved) == 1
    assert saved[0].user_transcript == MOCK_TRANSCRIPT
    assert saved[0].ai_reply_text == MOCK_REPLY


@patch("app.api.v1.endpoints.speaking.synthesize_speech", side_effect=RuntimeError("TTS offline"))
@patch(
    "app.api.v1.endpoints.speaking.generate_tutor_reply",
    return_value={"reply": MOCK_REPLY, "grammar_correction": ""},
)
@patch("app.api.v1.endpoints.speaking.transcribe_audio", return_value=MOCK_TRANSCRIPT)
@patch("app.api.v1.endpoints.speaking.get_groq_client", return_value=MagicMock())
def test_speaking_message_works_without_tts(
    _client,
    _transcribe,
    _tutor,
    _tts,
    client,
    user_headers,
    db_session,
):
    lesson = _seed_lesson(db_session)
    session_id = _open_session(client, user_headers, lesson.id)

    response = client.post(
        f"/api/v1/speaking/sessions/{session_id}/messages",
        headers=user_headers,
        files={"audio": ("speech.wav", BytesIO(b"fake"), "audio/wav")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ai_reply_text"] == MOCK_REPLY
    assert body["ai_audio_url"] == ""


@patch("app.api.v1.endpoints.speaking.transcribe_audio", return_value="")
@patch("app.api.v1.endpoints.speaking.get_groq_client", return_value=MagicMock())
def test_speaking_message_rejects_empty_transcript(
    _client,
    _transcribe,
    client,
    user_headers,
    db_session,
):
    lesson = _seed_lesson(db_session)
    session_id = _open_session(client, user_headers, lesson.id)

    response = client.post(
        f"/api/v1/speaking/sessions/{session_id}/messages",
        headers=user_headers,
        files={"audio": ("speech.m4a", BytesIO(b"silent"), "audio/mp4")},
    )
    assert response.status_code == 400
    assert "transcribe" in response.json()["detail"].lower()


@patch("app.api.v1.endpoints.speaking.get_groq_client", side_effect=ValueError("GROQ_API_KEY is missing"))
def test_speaking_message_requires_groq_key(_get_client, client, user_headers, db_session):
    lesson = _seed_lesson(db_session)
    session_id = _open_session(client, user_headers, lesson.id)

    response = client.post(
        f"/api/v1/speaking/sessions/{session_id}/messages",
        headers=user_headers,
        files={"audio": ("speech.m4a", BytesIO(b"x"), "audio/mp4")},
    )
    assert response.status_code == 503


def test_speaking_message_unknown_session_is_404(client, user_headers):
    response = client.post(
        "/api/v1/speaking/sessions/missing/messages",
        headers=user_headers,
        files={"audio": ("speech.m4a", BytesIO(b"x"), "audio/mp4")},
    )
    assert response.status_code == 404


def test_speaking_message_rejects_bad_audio_type(client, user_headers, db_session):
    lesson = _seed_lesson(db_session)
    session_id = _open_session(client, user_headers, lesson.id)
    response = client.post(
        f"/api/v1/speaking/sessions/{session_id}/messages",
        headers=user_headers,
        files={"audio": ("notes.txt", BytesIO(b"hello"), "text/plain")},
    )
    assert response.status_code == 400


def test_speaking_session_requires_auth(client):
    assert client.post("/api/v1/speaking/sessions", json={"lesson_id": 1}).status_code == 401


def test_speaking_session_missing_lesson_is_404(client, user_headers):
    response = client.post(
        "/api/v1/speaking/sessions",
        headers=user_headers,
        json={"lesson_id": 9999},
    )
    assert response.status_code == 404


def test_speaking_session_end_stores_learning_time(client, user_headers, db_session):
    lesson = _seed_lesson(db_session)
    session_id = _open_session(client, user_headers, lesson.id)

    ended = client.post(
        f"/api/v1/speaking/sessions/{session_id}/end",
        headers=user_headers,
        json={"duration_seconds": 42},
    )
    assert ended.status_code == 200, ended.text
    assert ended.json()["session_id"] == session_id
    assert ended.json()["duration_seconds"] == 42

    rows = list(
        db_session.scalars(
            select(LearningSession).where(LearningSession.speaking_session_id == session_id)
        ).all()
    )
    assert len(rows) == 1
    assert rows[0].session_type == "speaking"
    assert rows[0].duration_seconds == 42
