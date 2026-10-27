"""
FastAPI application entrypoint for the Spoken English backend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers (wired here; route modules will be filled in next)
from app.routers import auth, exercises, lessons, payments, units

app = FastAPI(
    title="English Development App API",
    description="Backend for the Spoken English mobile app and Admin Panel.",
    version="0.1.0",
)

# Allow Admin Panel (Next.js) and Expo mobile app during local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Admin Panel (Next.js)
        "http://localhost:8081",  # React Native Expo
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(units.router, prefix="/api/units", tags=["Units"])
app.include_router(lessons.router, prefix="/api/lessons", tags=["Lessons"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["Exercises"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])


@app.get("/", tags=["Health"])
async def root() -> dict[str, str]:
    """Welcome / health check endpoint."""
    return {
        "message": "Welcome to the English Development App API",
        "status": "ok",
    }
