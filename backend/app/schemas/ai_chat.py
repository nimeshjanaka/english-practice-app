"""Schemas for the voice AI chat endpoint."""

from pydantic import BaseModel, Field


class ChatResponse(BaseModel):
    """Response returned to the mobile app after the AI voice loop."""

    transcript: str = Field(description="What Whisper heard from the user")
    reply: str = Field(description="Tutor reply text")
    grammar_correction: str = Field(description="Grammar / pronunciation notes")
    audio_url: str = Field(description="URL to the generated MP3 reply")
    ai_talk_time_seconds: int = Field(description="Updated cumulative AI talk time for this lesson")
