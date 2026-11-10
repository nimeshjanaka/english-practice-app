"""Groq Whisper → AI KIT tutor → Orpheus TTS pipeline."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from groq import Groq
from groq import NotFoundError as GroqNotFoundError

from app.config import get_settings

# Groq models: Whisper STT, chat tutor replies, Orpheus TTS when enabled
STT_MODEL = "whisper-large-v3"
# Prefer GROQ_CHAT_MODEL from .env; these are tried in order if one is unavailable.
CHAT_MODEL_FALLBACKS = (
    "openai/gpt-oss-20b",
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
)
TTS_MODEL = "canopylabs/orpheus-v1-english"
TTS_VOICE = "autumn"
TTS_MAX_CHARS = 200  # Orpheus input limit


def _chat_models() -> list[str]:
    settings = get_settings()
    preferred = (settings.GROQ_CHAT_MODEL or "").strip()
    ordered = [preferred, *CHAT_MODEL_FALLBACKS] if preferred else list(CHAT_MODEL_FALLBACKS)
    seen: set[str] = set()
    models: list[str] = []
    for name in ordered:
        if name and name not in seen:
            seen.add(name)
            models.append(name)
    return models

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

ROLEPLAY_SYSTEM_PROMPT = """
You are in a spoken English ROLE PLAY with the learner.
Stay fully in character as the partner described in the role context.
Have a natural two-person conversation (you ↔ learner).

Rules:
1. Reply ONLY as your character, in 1-2 short spoken sentences (under 180 characters).
2. Keep the scene moving with a natural question or next step.
3. If the learner's English is weak or wrong, still stay in character, but weave a clearer
   rephrase into your reply (e.g. "Sure — so you'd like a medium latte, right?").
4. In "grammar_correction", add a short tip when useful; otherwise use "".
5. Do not break character. Do not say you are an AI tutor.

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


def _sniff_audio_filename(data: bytes, fallback_name: str) -> str:
    """
    Pick a Groq-safe filename from magic bytes.

    Whisper keys off the extension; a wrong label (e.g. CAF bytes as .m4a) returns 400.
    """
    name = fallback_name or "speech.m4a"
    stem = Path(name).stem or "speech"

    if len(data) >= 12 and data.startswith(b"RIFF") and data[8:12] == b"WAVE":
        return f"{stem}.wav"
    if len(data) >= 12 and data[4:8] == b"ftyp":
        return f"{stem}.m4a"
    if data.startswith(b"OggS"):
        return f"{stem}.ogg"
    if data.startswith(b"\x1aE\xdf\xa3"):
        return f"{stem}.webm"
    if data.startswith(b"ID3") or (len(data) >= 2 and data[0] == 0xFF and data[1] & 0xE0 == 0xE0):
        return f"{stem}.mp3"
    if data.startswith(b"caff"):
        # iOS Core Audio — not accepted by Groq; surface a clear error upstream.
        raise ValueError(
            "Unsupported iOS CAF recording. Re-record with AAC/M4A (restart the role play and try again)."
        )
    # Keep the original extension when we cannot sniff (already validated by the router).
    return name


def transcribe_audio(client: Groq, audio_path: Path) -> str:
    """Speech-to-text via Groq Whisper large-v3."""
    data = audio_path.read_bytes()
    upload_name = _sniff_audio_filename(data, audio_path.name)
    result = client.audio.transcriptions.create(
        file=(upload_name, data),
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
    role_context: str | None = None,
) -> dict[str, str]:
    """
    Ask the Groq chat model for a tutor or role-play reply as JSON.

    Returns dict with keys: reply, grammar_correction.
    """
    parts: list[str] = []
    role = (role_context or "").strip()
    if role:
        parts.append(f"Role context: {role}")
    elif lesson_title:
        parts.append(f'Lesson context: "{lesson_title}".')
    if current_question and not role:
        parts.append(f'AI KIT asked: "{current_question}".')
    parts.append(f"Learner said: {learner_text}")
    user_content = "\n".join(parts)

    system_prompt = ROLEPLAY_SYSTEM_PROMPT if role else TUTOR_SYSTEM_PROMPT
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]
    last_error: Exception | None = None
    raw = "{}"
    for model in _chat_models():
        try:
            completion = client.chat.completions.create(
                model=model,
                response_format={"type": "json_object"},
                messages=messages,
                temperature=0.5,
            )
            raw = completion.choices[0].message.content or "{}"
            last_error = None
            break
        except GroqNotFoundError as exc:
            last_error = exc
            continue
    if last_error is not None:
        raise last_error

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
