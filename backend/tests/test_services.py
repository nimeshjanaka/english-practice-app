"""Unit tests for pure service helpers (no HTTP / OpenAI)."""

from app.services.ai_chat import _parse_tutor_json, estimate_talk_seconds
from app.services.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip():
    hashed = hash_password("secret12345")
    assert hashed != "secret12345"
    assert verify_password("secret12345", hashed)
    assert not verify_password("wrong", hashed)


def test_jwt_roundtrip():
    token = create_access_token(subject=42)
    payload = decode_access_token(token)
    assert payload["sub"] == "42"


def test_estimate_talk_seconds():
    assert estimate_talk_seconds("") == 1
    assert estimate_talk_seconds("one two three four five") >= 1


def test_parse_tutor_json_plain_and_fenced():
    plain = _parse_tutor_json('{"reply": "Hi", "grammar_correction": ""}')
    assert plain["reply"] == "Hi"

    fenced = _parse_tutor_json('```json\n{"reply": "Hello", "grammar_correction": "ok"}\n```')
    assert fenced["reply"] == "Hello"
    assert fenced["grammar_correction"] == "ok"

    fallback = _parse_tutor_json("not-json-at-all")
    assert "reply" in fallback
