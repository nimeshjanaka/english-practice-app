"""
Seed PostgreSQL with the full A1 Unit 1 path and exercises.

Run from the backend folder (with venv activated):

    python seed.py
"""

from __future__ import annotations

from scripts.seed_a1_unit1 import seed_a1_unit1


def seed() -> None:
    counts = seed_a1_unit1()
    print("Seed complete (A1 Unit 1 — Introducing Yourself).")
    for title, count in counts.items():
        print(f"  Lesson '{title}' → {count} exercise(s)")


if __name__ == "__main__":
    seed()
