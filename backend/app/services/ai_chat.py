"""Groq Whisper → AI KIT tutor → Orpheus TTS pipeline."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from groq import Groq

from app.config import get_settings

# Models available on this Groq account (playai-tts / llama-3.3 are unavailable)
STT_MODEL = "whisper-large-v3"
CHAT_MODEL = "openai/gpt-oss-20b"
TTS_MODEL = "canopylabs/orpheus-v1-english"
TTS_VOICE = "autumn"
TTS_MAX_CHARS = 200  # Orpheus input limit

TUTOR_SYSTEM_PROMPT = """
You are AI KIT, a friendly spoken-English coach.
You ONLY react to what the learner just said out loud (the transcript).
Do not invent stories about them. Do not ask the next interview question —
the app asks questions separately.

Your job:
1. Listen to their answer.
2. If their English is weak, awkward, or wrong: correct it clearly.
3. In "reply", speak naturally in 1-2 short sentences (under 180 characters).
   When correction is needed, include the better sentence, e.g.
   "Nice try. Better: My name is Sam."
   If their English was already good, briefly praise and mirror a clean version.
4. In "grammar_correction", write a short tip about grammar/pronunciation/word choice.
   If everything was fine, use an empty string "".

Respond ONLY with valid JSON (no markdown) with exactly:
- "reply"
- "grammar_correction"
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
            model=STT_MODEL,
            language="en",
            response_format="json",
            temperature=0.0,
        )
    return (getattr(result, "text", None) or "").strip()


def generate_tutor_reply(
    client: Groq,
    learner_text: str,
    lesson_title: str | None = None,
    current_question: str | None = None,
) -> dict[str, str]:
    """
    Ask the Groq chat model for a correction-focused AI KIT reply as JSON.

    Returns dict with keys: reply, grammar_correction.
    """
    parts: list[str] = []
    if lesson_title:
        parts.append(f'Lesson context: "{lesson_title}".')
    if current_question:
        parts.append(f'AI KIT asked: "{current_question}".')
    parts.append(f"Learner said: {learner_text}")
    user_content = "\n".join(parts)

    completion = client.chat.completions.create(
        model=CHAT_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": TUTOR_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.5,
    )
    raw = completion.choices[0].message.content or "{}"
    data = _parse_tutor_json(raw)
    reply = str(data.get("reply", "")).strip() or "Good try! Say that again a little clearer."
    # Keep TTS within Orpheus's 200-character limit
    if len(reply) > TTS_MAX_CHARS:
        reply = reply[: TTS_MAX_CHARS - 1].rstrip() + "…"
    return {
        "reply": reply,
        "grammar_correction": str(data.get("grammar_correction", "")).strip(),
    }


def synthesize_speech(client: Groq, text: str, output_path: Path) -> None:
    """
    Text-to-speech via Groq Orpheus; writes a WAV to output_path.

    Requires accepting Orpheus terms in the Groq console for this org/key.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    spoken = (text or "").strip()[:TTS_MAX_CHARS] or "Great job!"
    response = client.audio.speech.create(
        model=TTS_MODEL,
        voice=TTS_VOICE,
        input=spoken,
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
