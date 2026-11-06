"""Speaking practice: one session, then voice messages."""

from pydantic import BaseModel, Field


class SpeakingSessionCreate(BaseModel):
    lesson_id: int


class SpeakingSessionOut(BaseModel):
    id: str
    lesson_id: int


class SpeakingMessageOut(BaseModel):
    """Tutor turn after the learner's recording is transcribed."""

    transcript: str = Field(description="What the learner said")
    reply: str = Field(description="Tutor reply to speak aloud")
    grammar_correction: str = Field(description="Empty when the English was already fine")
    audio_url: str = Field(description="URL of the tutor WAV, or empty if speech could not be made")
