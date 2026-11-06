"""Shared curriculum constants. Strings (not PG enums) so SQLite tests stay valid."""

CONTENT_STATUSES = (
    "draft",
    "generated",
    "under_review",
    "changes_requested",
    "approved",
    "published",
    "archived",
)

CEFR_CODES = ("A1", "A2", "B1", "B2", "C1", "C2")

LEVEL_SEED = (
    ("A1", "Beginner", "Basic communication", 1),
    ("A2", "Elementary", "Everyday English", 2),
    ("B1", "Intermediate", "Independent communication", 3),
    ("B2", "Upper Intermediate", "Professional communication", 4),
    ("C1", "Advanced", "Advanced English", 5),
    ("C2", "Proficient", "Mastery and fluency", 6),
)

EXERCISE_TYPES = (
    "multiple_choice",
    "multiple_select",
    "fill_blank",
    "matching",
    "drag_drop",
    "sentence_ordering",
    "true_false",
    "error_correction",
    "translation",
    "listening",
    "dictation",
    "pronunciation",
    "speaking",
    "reading",
    "picture_description",
    "writing",
)

# Legacy mobile types remain valid alongside the new engine types.
LEGACY_EXERCISE_TYPES = ("drag-drop-match", "fill-blank", "mcq")

LEARNER_VISIBLE_STATUSES = ("approved", "published")

A1_UNIT_01_LESSONS = (
    (1, "Greetings", "Matching, MCQ, speaking"),
    (2, "Introducing yourself", "Fill blanks, sentence building"),
    (3, "Personal information", "Questions and answers"),
    (4, "Countries and nationalities", "Vocabulary, matching"),
    (5, "Jobs and professions", "Picture matching, grammar"),
    (6, "Asking questions", "Drag and drop, correction"),
    (7, "Listening practice", "Dictation, listening MCQ"),
    (8, "Speaking practice", "AI roleplay"),
    (9, "Revision", "Mixed exercises"),
    (10, "Unit examination", "Comprehensive test"),
)
