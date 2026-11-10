"""Auth routes: register, login, Google, forgot/reset password, /me."""

import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    GoogleAuthRequest,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.security import (
    JWTError,
    create_access_token,
    create_reset_token,
    decode_reset_token,
    hash_password,
    verify_password,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    """Register a new user and return a JWT (auto sign-in)."""
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=UserRole.USER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return Token(access_token=create_access_token(subject=user.id), token_type="bearer")


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Verify email/password and return a JWT access token."""
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return Token(access_token=create_access_token(subject=user.id), token_type="bearer")


@router.post("/google", response_model=Token)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)) -> Token:
    """
    Sign up / sign in with a Google ID token from the mobile app.

    Requires GOOGLE_CLIENT_ID in backend/.env (Web client ID).
    """
    settings = get_settings()
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Sign-In is not configured. Set GOOGLE_CLIENT_ID in backend/.env",
        )

    try:
        info = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        ) from exc

    email = str(info.get("email", "")).lower().strip()
    if not email or not info.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email is missing or not verified",
        )

    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        # Google accounts get a random unusable local password
        user = User(
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            role=UserRole.USER,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return Token(access_token=create_access_token(subject=user.id), token_type="bearer")


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    """
    Start password reset.

    Always returns a generic message (no email enumeration).
    In DEBUG_AUTH mode, includes reset_token when the user exists.
    """
    settings = get_settings()
    generic = "If that email is registered, you can reset your password."

    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None:
        return ForgotPasswordResponse(message=generic, reset_token=None)

    token = create_reset_token(subject=user.id)
    # Production: send email with deep link. Local/dev: return token for the app UI.
    return ForgotPasswordResponse(
        message=generic,
        reset_token=token if settings.DEBUG_AUTH else None,
    )


@router.post("/reset-password", response_model=Token)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> Token:
    """Set a new password using a valid reset token, then return a login JWT."""
    try:
        data = decode_reset_token(payload.token)
        user_id = int(data["sub"])
    except (JWTError, ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        ) from None

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")

    user.password_hash = hash_password(payload.new_password)
    db.commit()

    return Token(access_token=create_access_token(subject=user.id), token_type="bearer")


@router.get("/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_user)) -> User:
    """Return the authenticated user profile."""
    return current_user
