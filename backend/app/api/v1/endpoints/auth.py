"""Versioned auth routes.

Registration, login, and JWT checks stay in app.routers.auth and app.deps.
These routes are aliases under /api/v1/auth so the mobile app can keep
calling /api/auth.

The student role is stored as UserRole.USER ("user"). Admin is UserRole.ADMIN.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin, get_current_user
from app.models.user import User
from app.routers.auth import login as login_user
from app.routers.auth import register as register_user
from app.schemas.user import Token, UserCreate, UserLogin, UserResponse

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    """Register a student and return a JWT. New accounts are always role user."""
    return register_user(payload, db)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Verify email and password and return a JWT access token."""
    return login_user(payload, db)


@router.get("/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_user)) -> User:
    """Return the signed-in student or admin."""
    return current_user


def require_student(current_user: User = Depends(get_current_user)) -> User:
    """Any authenticated student or admin."""
    return current_user


def require_admin(current_user: User = Depends(get_current_admin)) -> User:
    """Authenticated admin only."""
    return current_user
