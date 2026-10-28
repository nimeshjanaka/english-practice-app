"""
Application configuration loaded from environment variables.

Secrets live in backend/.env (never commit real keys).
Defaults in this file are only safe local fallbacks — production must use .env.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load .env from the backend/ folder (not the process cwd)
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Central settings for the FastAPI backend."""

    # PostgreSQL — must match your local/production DB
    DATABASE_URL: str = "postgresql://nimeshjanaka@localhost:5432/englishapp"

    # OpenAI API key for Whisper, GPT, and TTS (set in .env)
    OPENAI_API_KEY: str = ""

    # JWT auth — override SECRET_KEY in .env with a long random string
    SECRET_KEY: str = "dev-only-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (safe to call from Depends)."""
    return Settings()
