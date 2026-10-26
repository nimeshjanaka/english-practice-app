"""
Application configuration loaded from environment variables.

Uses pydantic-settings so values are typed and validated at startup.
Keep secrets in a `.env` file in the backend/ folder (never commit real keys).
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings for the FastAPI backend."""

    # PostgreSQL connection string, e.g. postgresql://user:pass@localhost:5432/dbname
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/english_dev_app"

    # OpenAI API key for Whisper, GPT, and TTS
    OPENAI_API_KEY: str = ""

    # JWT auth
    SECRET_KEY: str = "change-me-to-a-long-random-string"
    ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (safe to call from Depends)."""
    return Settings()
