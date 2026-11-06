"""Admin schemas for the curriculum CMS."""

from pydantic import BaseModel, Field


class LevelOut(BaseModel):
    code: str
    name: str
    description: str
    sort_order: int

    model_config = {"from_attributes": True}


class CourseCreate(BaseModel):
    level_code: str = Field(min_length=2, max_length=8)
    title: str = Field(min_length=1, max_length=255)
    description: str = ""
    status: str = "draft"
    order_index: int = 0


class CourseOut(CourseCreate):
    id: int

    model_config = {"from_attributes": True}


class CoursePublic(BaseModel):
    """Course fields returned to a signed-in learner."""

    id: int
    level_code: str
    title: str
    description: str
    order_index: int

    model_config = {"from_attributes": True}


class PathLessonOut(BaseModel):
    """One lesson node on the learner path."""

    id: int
    title: str
    icon_name: str
    order_index: int
    is_completed: bool
    unit_title: str = ""
    status: str = "published"


class CoursePathOut(CoursePublic):
    """Published course plus the lessons a learner can walk."""

    status: str = "published"
    lessons: list[PathLessonOut] = []


class AdminLessonCreate(BaseModel):
    """Form payload from the curriculum page."""

    title: str = Field(min_length=1, max_length=255)
    unit: str = Field(min_length=1, max_length=255)
    level: str = Field(min_length=2, max_length=8)
    order_index: int = Field(ge=0)


class AdminLessonOut(BaseModel):
    id: int
    title: str
    unit: str
    level: str
    order_index: int
    status: str


class UnitCmsCreate(BaseModel):
    title: str
    order_index: int = 0
    course_id: int | None = None
    level_code: str | None = None
    description: str = ""
    outcome: str = ""
    status: str = "draft"


class UnitCmsOut(UnitCmsCreate):
    id: int

    model_config = {"from_attributes": True}


class LessonCmsCreate(BaseModel):
    unit_id: int
    title: str
    icon_name: str = "book"
    order_index: int = 0
    summary: str = ""
    status: str = "draft"


class LessonCmsOut(LessonCmsCreate):
    id: int

    model_config = {"from_attributes": True}


class SectionCreate(BaseModel):
    lesson_id: int
    kind: str
    title: str
    body: str = ""
    order_index: int = 0
    status: str = "draft"


class SectionOut(SectionCreate):
    id: int

    model_config = {"from_attributes": True}


class ExerciseCmsCreate(BaseModel):
    lesson_id: int
    type: str
    prompt: str
    question_data: dict
    correct_answer: dict
    explanation: str = ""
    feedback: str = ""
    difficulty: str = "A1"
    marks: int = 1
    learning_objective: str = ""
    order_index: int = 0
    status: str = "draft"


class ExerciseCmsOut(BaseModel):
    id: int
    lesson_id: int
    type: str
    prompt: str
    explanation: str
    feedback: str
    difficulty: str
    marks: int
    learning_objective: str
    order_index: int
    status: str
    question_data: dict
    correct_answer: dict

    model_config = {"from_attributes": True}


class GrammarCreate(BaseModel):
    level_code: str
    title: str
    explanation: str = ""
    explanation_si: str = ""
    examples: str = ""
    status: str = "draft"


class GrammarOut(GrammarCreate):
    id: int

    model_config = {"from_attributes": True}


class VocabCreate(BaseModel):
    term: str
    level_code: str = "A1"
    lesson_id: int | None = None
    part_of_speech: str = ""
    definition: str = ""
    example: str = ""
    translation_si: str = ""
    status: str = "draft"


class VocabOut(BaseModel):
    id: int
    term: str
    level_code: str
    lesson_id: int | None
    part_of_speech: str
    definition: str
    example: str
    status: str
    translation_si: str = ""

    model_config = {"from_attributes": True}


class ListeningCreate(BaseModel):
    title: str
    lesson_id: int | None = None
    transcript: str = ""
    audio_url: str = ""
    status: str = "draft"


class ListeningOut(ListeningCreate):
    id: int

    model_config = {"from_attributes": True}


class SpeakingCreate(BaseModel):
    title: str
    situation: str = ""
    tutor_instructions: str = ""
    lesson_id: int | None = None
    level_code: str = "A1"
    status: str = "draft"


class SpeakingOut(SpeakingCreate):
    id: int

    model_config = {"from_attributes": True}


class AssessmentCreate(BaseModel):
    unit_id: int
    title: str
    instructions: str = ""
    pass_mark: int = 70
    status: str = "draft"


class AssessmentOut(AssessmentCreate):
    id: int

    model_config = {"from_attributes": True}


class StatusChange(BaseModel):
    entity_type: str
    entity_id: int
    status: str
    note: str = ""


class GenerateLessonRequest(BaseModel):
    level_code: str = "A1"
    unit_title: str = Field(min_length=1, max_length=255)
    lesson_topic: str = Field(min_length=1, max_length=255)
    exercise_count: int = Field(default=4, ge=1, le=30)
    exercise_types: list[str] = Field(default_factory=lambda: ["multiple_choice"])


class DraftExercise(BaseModel):
    """One exercise inside a reviewable AI draft."""

    type: str
    prompt: str
    question_data: dict
    correct_answer: dict
    explanation: str = ""
    feedback: str = ""
    difficulty: str = "A1"
    marks: int = 1
    learning_objective: str = ""
    order_index: int = 0
    status: str = "generated"


class LessonDraft(BaseModel):
    """JSON the admin reviews before anything is written."""

    level_code: str
    unit_title: str = Field(min_length=1, max_length=255)
    lesson_topic: str = Field(min_length=1, max_length=255)
    summary: str = "AI draft — needs human review"
    status: str = "generated"
    exercises: list[DraftExercise]


class OverviewOut(BaseModel):
    levels: int
    courses: int
    units: int
    lessons: int
    exercises: int
    drafts: int
    published_lessons: int
