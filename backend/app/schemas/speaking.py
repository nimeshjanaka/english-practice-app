"""Speaking practice: one session, then voice messages."""

from pydantic import BaseModel, Field


class SpeakingSessionCreate(BaseModel):
    lesson_id: int


class SpeakingSessionOut(BaseModel):
    session_id: str
    lesson_id: int


class SpeakingMessageOut(BaseModel):
    """Tutor turn after the learner's recording is transcribed."""

    user_transcript: str = Field(description="What the learner said")
    ai_reply_text: str = Field(description="Tutor reply to speak aloud")
    grammar_correction: str = Field(description="Empty when the English was already fine")
    ai_audio_url: str = Field(
        description="URL of the tutor audio, or empty if TTS is not configured",
    )


class SpeakingSessionEnd(BaseModel):
    """Optional client-reported duration when closing a speaking session."""

    duration_seconds: int | None = Field(default=None, ge=0)


class SpeakingSessionEndOut(BaseModel):
    session_id: str
    duration_seconds: int
    lesson_completed: bool = Field(
        default=False,
        description="True when exercises were done and speaking finish unlocked this lesson on the path.",
    )
