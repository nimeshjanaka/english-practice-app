"""
Seed the full A1 Unit 1 curriculum: Introducing Yourself.

Content mirrors the Speakora learning-path lesson list
(Greetings → Unit examination) with published exercises for each lesson.

Run from the backend folder (venv activated):

    python scripts/seed_a1_unit1.py
    # or
    python seed.py
"""

from __future__ import annotations

import sys
from pathlib import Path

# Allow `python scripts/seed_a1_unit1.py` from repo root or backend/
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal
from app.domain.content import A1_UNIT_01_LESSONS, LEVEL_SEED
from app.models.curriculum import CefrLevel, Course
from app.models.exercise import Exercise
from app.models.lesson import Lesson
from app.models.unit import Unit
from app.models.user_progress import UserProgress

UNIT_TITLE = "Introducing Yourself"
COURSE_TITLE = "A1 English"

LESSON_ICONS = {
    "Greetings": "wave",
    "Introducing yourself": "users",
    "Personal information": "user",
    "Countries and nationalities": "globe",
    "Jobs and professions": "briefcase",
    "Asking questions": "message",
    "Listening practice": "headphones",
    "Speaking practice": "mic",
    "Revision": "refresh",
    "Unit examination": "exam",
}


def _ensure_levels(db) -> None:
    for code, name, description, order in LEVEL_SEED:
        if db.get(CefrLevel, code) is None:
            db.add(CefrLevel(code=code, name=name, description=description, sort_order=order))
    db.flush()


def _ensure_course(db) -> Course:
    course = db.query(Course).filter(Course.title == COURSE_TITLE).first()
    if course is None:
        course = Course(
            level_code="A1",
            title=COURSE_TITLE,
            description="First release: introducing yourself and basic communication.",
            status="published",
            order_index=1,
        )
        db.add(course)
        db.flush()
    else:
        course.status = "published"
        course.level_code = "A1"
    return course


def _clear_unit_exercises(db, unit: Unit) -> None:
    lesson_ids = [row.id for row in db.query(Lesson.id).filter(Lesson.unit_id == unit.id).all()]
    if not lesson_ids:
        return
    db.query(Exercise).filter(Exercise.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)


def _ensure_unit_and_lessons(db, course: Course) -> dict[str, Lesson]:
    unit = db.query(Unit).filter(Unit.title == UNIT_TITLE).first()
    if unit is None:
        unit = Unit(
            title=UNIT_TITLE,
            order_index=1,
            level_code="A1",
            description="A1 Unit 1 — greetings, introductions, and basic personal English.",
            outcome="Hold a short first conversation.",
            status="published",
            course_id=course.id,
        )
        db.add(unit)
        db.flush()
    else:
        unit.course_id = course.id
        unit.level_code = "A1"
        unit.status = "published"
        unit.description = "A1 Unit 1 — greetings, introductions, and basic personal English."

    # Drop legacy title variants from earlier seeds so the path matches the design.
    legacy_titles = {
        "Introductions",
        "Countries",
        "Jobs",
        "Listening",
        "Speaking",
        "Unit test",
    }
    wanted_titles = {title for _, title, _ in A1_UNIT_01_LESSONS}
    stale = (
        db.query(Lesson)
        .filter(Lesson.unit_id == unit.id, Lesson.title.in_(legacy_titles - wanted_titles))
        .all()
    )
    for lesson in stale:
        db.query(UserProgress).filter(UserProgress.lesson_id == lesson.id).delete(synchronize_session=False)
        db.query(Exercise).filter(Exercise.lesson_id == lesson.id).delete(synchronize_session=False)
        db.delete(lesson)
    db.flush()

    by_title: dict[str, Lesson] = {}
    for order, title, _kinds in A1_UNIT_01_LESSONS:
        lesson = (
            db.query(Lesson)
            .filter(Lesson.unit_id == unit.id, Lesson.title == title)
            .first()
        )
        if lesson is None:
            lesson = Lesson(
                unit_id=unit.id,
                title=title,
                icon_name=LESSON_ICONS.get(title, "book"),
                order_index=order,
                summary=f"A1 Unit 1 · Lesson {order}: {title}",
                status="published",
            )
            db.add(lesson)
            db.flush()
        else:
            lesson.order_index = order
            lesson.icon_name = LESSON_ICONS.get(title, lesson.icon_name or "book")
            lesson.status = "published"
            lesson.summary = f"A1 Unit 1 · Lesson {order}: {title}"
        by_title[title] = lesson

    _clear_unit_exercises(db, unit)
    return by_title


def _mcq(lesson_id: int, prompt: str, options: list[str], answer: str, order: int, explanation: str) -> Exercise:
    return Exercise(
        lesson_id=lesson_id,
        type="multiple_choice",
        prompt=prompt,
        question_data={"question": prompt, "options": options},
        correct_answer={"answer": answer},
        explanation=explanation,
        marks=1,
        difficulty="A1",
        order_index=order,
        status="published",
    )


def _fill(lesson_id: int, prompt: str, answer: str, order: int, explanation: str) -> Exercise:
    return Exercise(
        lesson_id=lesson_id,
        type="fill_blank",
        prompt=prompt,
        question_data={"question": prompt, "blank": "_____"},
        correct_answer={"answer": answer},
        explanation=explanation,
        marks=1,
        difficulty="A1",
        order_index=order,
        status="published",
    )


def _match(lesson_id: int, prompt: str, options: list[str], answer: str, order: int, explanation: str) -> Exercise:
    return Exercise(
        lesson_id=lesson_id,
        type="drag-drop-match",
        prompt=prompt,
        question_data={
            "prompt": prompt,
            "prompt_value": prompt,
            "options": options,
            "instruction": "Drag and drop the correct answer here",
        },
        correct_answer={"answer": answer},
        explanation=explanation,
        marks=1,
        difficulty="A1",
        order_index=order,
        status="published",
    )


def _order(lesson_id: int, prompt: str, words: list[str], order: int, explanation: str) -> Exercise:
    return Exercise(
        lesson_id=lesson_id,
        type="sentence_ordering",
        prompt=prompt,
        question_data={"question": prompt, "words": words},
        correct_answer={"order": words},
        explanation=explanation,
        marks=1,
        difficulty="A1",
        order_index=order,
        status="published",
    )


def _seed_exercises(db, lessons: dict[str, Lesson]) -> None:
    greetings = lessons["Greetings"].id
    introducing = lessons["Introducing yourself"].id
    personal = lessons["Personal information"].id
    countries = lessons["Countries and nationalities"].id
    jobs = lessons["Jobs and professions"].id
    asking = lessons["Asking questions"].id
    listening = lessons["Listening practice"].id
    speaking = lessons["Speaking practice"].id
    revision = lessons["Revision"].id
    exam = lessons["Unit examination"].id

    exercises = [
        # 1 Greetings
        _match(
            greetings,
            "Match the greeting",
            ["Hello", "Goodbye", "Thanks", "Please", "Sorry", "Yes", "No", "Okay"],
            "Hello",
            1,
            "Hello is a friendly greeting.",
        ),
        _mcq(
            greetings,
            "What do you say in the morning?",
            ["Good night", "Good morning", "See you", "Goodbye"],
            "Good morning",
            2,
            "Use Good morning before noon.",
        ),
        _mcq(
            greetings,
            "Which phrase means goodbye?",
            ["Nice to meet you", "See you later", "How are you?", "My name is Ana"],
            "See you later",
            3,
            "See you later is a common goodbye.",
        ),
        # 2 Introducing yourself
        _fill(
            introducing,
            "Complete: My name _____ Sam.",
            "is",
            1,
            "Use is with he/she/it and with 'My name'.",
        ),
        _order(
            introducing,
            "Put the words in order.",
            ["My", "name", "is", "Lina"],
            2,
            "Subject + name + is + name.",
        ),
        _mcq(
            introducing,
            "Choose the correct sentence.",
            ["I is Tom.", "I am Tom.", "I are Tom.", "I be Tom."],
            "I am Tom.",
            3,
            "Use am with I.",
        ),
        # 3 Personal information
        _mcq(
            personal,
            "How old are you?",
            ["I have 20 years.", "I am 20 years old.", "I am old 20.", "My age have 20."],
            "I am 20 years old.",
            1,
            "Say: I am … years old.",
        ),
        _fill(
            personal,
            "Complete: I _____ from Spain.",
            "am",
            2,
            "Use am with I.",
        ),
        _mcq(
            personal,
            "What is your phone number?",
            ["It is 555-0199.", "I am 555-0199.", "My name is 555.", "Yes, please."],
            "It is 555-0199.",
            3,
            "Use It is for a number.",
        ),
        # 4 Countries and nationalities
        _match(
            countries,
            "Match: someone from Japan is …",
            ["Japanese", "Japan", "China", "Spanish", "France", "Italy"],
            "Japanese",
            1,
            "Japan → Japanese.",
        ),
        _mcq(
            countries,
            "She is from Brazil. She is …",
            ["Brazil", "Brazilian", "Spain", "Spanish"],
            "Brazilian",
            2,
            "Brazil → Brazilian.",
        ),
        _fill(
            countries,
            "Complete: He is _____ (country: Italy).",
            "Italian",
            3,
            "Italy → Italian.",
        ),
        # 5 Jobs and professions
        _mcq(
            jobs,
            "A person who teaches is a …",
            ["doctor", "teacher", "driver", "cook"],
            "teacher",
            1,
            "A teacher works in a school.",
        ),
        _match(
            jobs,
            "Match the job: hospital",
            ["doctor", "pilot", "chef", "farmer", "singer", "student"],
            "doctor",
            2,
            "Doctors often work in hospitals.",
        ),
        _fill(
            jobs,
            "Complete: She _____ a nurse.",
            "is",
            3,
            "Use is with she.",
        ),
        # 6 Asking questions
        _mcq(
            asking,
            "Choose the correct question.",
            ["Where you live?", "Where do you live?", "Where does you live?", "Where are live you?"],
            "Where do you live?",
            1,
            "Use do with you in present simple questions.",
        ),
        _order(
            asking,
            "Order the question.",
            ["What", "is", "your", "name"],
            2,
            "What + is + your + name.",
        ),
        _fill(
            asking,
            "Complete: _____ are you from?",
            "Where",
            3,
            "Where asks about place.",
        ),
        # 7 Listening practice (MCQ / dictation-style without audio files)
        _mcq(
            listening,
            "You hear: 'Good afternoon.' What is the greeting?",
            ["Good night", "Good afternoon", "Hello goodbye", "See you"],
            "Good afternoon",
            1,
            "Afternoon greetings use Good afternoon.",
        ),
        _fill(
            listening,
            "Dictation: write the missing word — Nice to _____ you.",
            "meet",
            2,
            "Nice to meet you.",
        ),
        _mcq(
            listening,
            "You hear a name: 'My name is Omar.' What is his name?",
            ["Omar", "Anna", "Maria", "John"],
            "Omar",
            3,
            "Listen for the name after 'My name is'.",
        ),
        # 8 Speaking practice — short prep prompts before the AI speak screen
        _mcq(
            speaking,
            "Before you speak, which line is best?",
            ["Hello, my name is …", "I no speak.", "Bye morning.", "Yes name."],
            "Hello, my name is …",
            1,
            "Start with a clear greeting and your name.",
        ),
        _fill(
            speaking,
            "Complete a speaking line: Nice to _____ you.",
            "meet",
            2,
            "Nice to meet you.",
        ),
        # 9 Revision
        _mcq(
            revision,
            "Pick the greeting.",
            ["Goodbye", "Hello", "Teacher", "Italian"],
            "Hello",
            1,
            "Hello is a greeting.",
        ),
        _fill(
            revision,
            "Complete: I _____ a student.",
            "am",
            2,
            "I + am.",
        ),
        _match(
            revision,
            "Match: France → …",
            ["French", "France", "Japanese", "Brazil", "Spain", "Italy"],
            "French",
            3,
            "France → French.",
        ),
        # 10 Unit examination
        _mcq(
            exam,
            "Choose the correct introduction.",
            ["I am Maria.", "I is Maria.", "I are Maria.", "I be Maria."],
            "I am Maria.",
            1,
            "I + am + name.",
        ),
        _mcq(
            exam,
            "Someone from Spain is …",
            ["Spain", "Spanish", "Spanean", "España"],
            "Spanish",
            2,
            "Spain → Spanish.",
        ),
        _fill(
            exam,
            "Complete: Where _____ you from?",
            "are",
            3,
            "Where are you from?",
        ),
        _order(
            exam,
            "Order: a polite goodbye.",
            ["See", "you", "later"],
            4,
            "See you later.",
        ),
    ]

    for item in exercises:
        db.add(item)


def seed_a1_unit1() -> dict[str, int]:
    """Create/update A1 Unit 1 and return exercise counts by lesson title."""
    db = SessionLocal()
    try:
        _ensure_levels(db)
        course = _ensure_course(db)
        lessons = _ensure_unit_and_lessons(db, course)
        _seed_exercises(db, lessons)
        db.commit()

        counts = {
            title: db.query(Exercise).filter(Exercise.lesson_id == lesson.id).count()
            for title, lesson in lessons.items()
        }
        return counts
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    counts = seed_a1_unit1()
    print("A1 Unit 1 seed complete.")
    for title, count in counts.items():
        print(f"  {title}: {count} exercise(s)")


if __name__ == "__main__":
    main()
