"""Groq Whisper → Llama tutor → PlayAI TTS pipeline."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from groq import Groq

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


def get_groq_client() -> Groq:
    """Build a Groq client from GROQ_API_KEY (env or settings)."""
    settings = get_settings()
    api_key = os.environ.get("GROQ_API_KEY") or settings.GROQ_API_KEY
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY is missing. Add it to backend/.env (never commit real keys)."
        )
    return Groq(api_key=api_key)


def transcribe_audio(client: Groq, audio_path: Path) -> str:
    """Speech-to-text via Groq Whisper large-v3."""
    with audio_path.open("rb") as audio_file:
        result = client.audio.transcriptions.create(
            file=(audio_path.name, audio_file.read()),
            model="whisper-large-v3",
            language="en",
            response_format="json",
            temperature=0.0,
        )
    return (getattr(result, "text", None) or "").strip()


def generate_tutor_reply(
    client: Groq,
    learner_text: str,
    lesson_title: str | None = None,
) -> dict[str, str]:
    """
    Ask Llama 3.3 70B for a tutor reply + grammar correction as JSON.

    Returns dict with keys: reply, grammar_correction.
    """
    context = f'Lesson context: "{lesson_title}".\n' if lesson_title else ""
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
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


def synthesize_speech(client: Groq, text: str, output_path: Path) -> None:
    """Text-to-speech via Groq PlayAI TTS; writes audio to output_path."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    # playai-tts defaults to wav; keep .wav extension on the saved file.
    response = client.audio.speech.create(
        model="playai-tts",
        voice="Fritz-PlayAI",
        input=text,
        response_format="wav",
    )
    response.write_to_file(str(output_path))


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
