"""Password hashing and JWT helpers."""

from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain-text password with bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Return True if the plain password matches the stored hash."""
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(subject: str | int, expires_delta: timedelta | None = None) -> str:
    """
    Create a signed JWT access token.

    `subject` is typically the user id (stored in the `sub` claim).
    """
    settings = get_settings()
    expire = datetime.now(UTC) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict[str, Any] = {"sub": str(subject), "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_reset_token(subject: str | int) -> str:
    """Create a short-lived JWT used only for password reset."""
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "type": "password_reset",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT with SECRET_KEY / ALGORITHM from settings.

    Raises JWTError if the signature is wrong, the token is expired, or malformed.
    """
    settings = get_settings()
    if not settings.SECRET_KEY:
        raise JWTError("SECRET_KEY is not configured")
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        options={"require_sub": True, "require_exp": True},
    )


def decode_reset_token(token: str) -> dict[str, Any]:
    """Decode a password-reset JWT; raises JWTError / ValueError if invalid."""
    payload = decode_access_token(token)
    if payload.get("type") != "password_reset":
        raise ValueError("Not a password-reset token")
    return payload


__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_reset_token",
    "decode_access_token",
    "decode_reset_token",
    "JWTError",
]
