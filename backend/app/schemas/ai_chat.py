"""Schemas for the voice AI chat endpoints."""

from pydantic import BaseModel, Field


class ChatResponse(BaseModel):
    """Response returned after the learner answers with voice."""

    transcript: str = Field(description="What Whisper heard from the user")
    reply: str = Field(description="AI KIT spoken correction / feedback")
    grammar_correction: str = Field(description="Grammar / pronunciation notes")
    audio_url: str = Field(description="URL to the generated WAV reply (may be empty)")
    ai_talk_time_seconds: int = Field(
        description="Updated cumulative AI talk time for this lesson"
    )


class SpeakResponse(BaseModel):
    """TTS-only response so AI KIT can ask a question without learner audio."""

    text: str = Field(description="Text that was (or will be) spoken")
    audio_url: str = Field(description="URL to the generated WAV (may be empty)")
