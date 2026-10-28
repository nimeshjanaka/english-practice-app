"""
FastAPI application entrypoint for the Spoken English backend.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import ai_chat, auth, content, payments, users

app = FastAPI(
    title="English Development App API",
    description="Backend for the Spoken English mobile app and Admin Panel.",
    version="0.1.0",
)

# Allow Admin Panel (Next.js) and Expo mobile / web during local development.
# React Native itself does not use CORS; this mainly helps Expo web + browsers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated TTS audio files
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
(STATIC_DIR / "audio").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Mount API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(ai_chat.router, prefix="/api/ai", tags=["AI Chat"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])


@app.get("/", tags=["Health"])
async def root() -> dict[str, str]:
    """Welcome / health check endpoint."""
    return {
        "message": "Welcome to the English Development App API",
        "status": "ok",
    }


@app.get("/json/version", tags=["Health"], include_in_schema=False)
async def json_version() -> dict[str, str]:
    """
    Quiet probe used by some IDE/browser tools (avoids noisy 404s in logs).
    Not part of the public API.
    """
    return {
        "name": app.title,
        "version": app.version,
        "status": "ok",
    }
