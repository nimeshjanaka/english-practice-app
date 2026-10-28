"""OpenAI Whisper → GPT tutor → TTS pipeline."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from openai import OpenAI

from app.config import get_settings

TUTOR_SYSTEM_PROMPT = """
You are a friendly, patient spoken-English tutor for beginners.
The learner spoke the message in the user content (transcribed from speech).

Respond ONLY with a valid JSON object (no markdown) with exactly these keys:
- "reply": a short natural spoken reply as the tutor (1-3 sentences). Encourage the learner.
- "grammar_correction": a brief note on grammar or pronunciation issues in what they said.
  If their English was fine, set this to an empty string "".

Keep language simple and supportive. Do not invent unrelated topics.
""".strip()


def get_openai_client() -> OpenAI:
    """Build an OpenAI client from environment settings."""
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        raise ValueError(
            "OPENAI_API_KEY is missing. Add it to backend/.env (never commit real keys)."
        )
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def transcribe_audio(client: OpenAI, audio_path: Path) -> str:
    """Speech-to-text via OpenAI Whisper."""
    with audio_path.open("rb") as audio_file:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
        )
    return (result.text or "").strip()


def generate_tutor_reply(client: OpenAI, learner_text: str, lesson_title: str | None = None) -> dict[str, str]:
    """
    Ask GPT-4o-mini for a tutor reply + grammar correction as JSON.

    Returns dict with keys: reply, grammar_correction.
    """
    context = f'Lesson context: "{lesson_title}".\n' if lesson_title else ""
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": TUTOR_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"{context}Learner said: {learner_text}",
            },
        ],
        temperature=0.6,
    )
    raw = completion.choices[0].message.content or "{}"
    data = _parse_tutor_json(raw)
    return {
        "reply": str(data.get("reply", "")).strip() or "Great effort! Try saying that again.",
        "grammar_correction": str(data.get("grammar_correction", "")).strip(),
    }


def synthesize_speech(client: OpenAI, text: str, output_path: Path) -> None:
    """Text-to-speech via OpenAI TTS; writes an MP3 to output_path."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with client.audio.speech.with_streaming_response.create(
        model="tts-1",
        voice="alloy",
        input=text,
        response_format="mp3",
    ) as response:
        response.stream_to_file(output_path)


def estimate_talk_seconds(text: str) -> int:
    """Rough spoken duration from word count (~2.5 words/sec)."""
    words = len(re.findall(r"\b\w+\b", text))
    return max(1, round(words / 2.5)) if words else 1


def _parse_tutor_json(raw: str) -> dict[str, Any]:
    """Parse model JSON; tolerate accidental markdown fences."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    return {"reply": cleaned, "grammar_correction": ""}
