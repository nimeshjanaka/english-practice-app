"""Curriculum content-management API. Admin only. Does not replace /api/content."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin
from app.domain.content import (
    A1_UNIT_01_LESSONS,
    CEFR_CODES,
    CONTENT_STATUSES,
    EXERCISE_TYPES,
    LEVEL_SEED,
)
from app.models.curriculum import (
    Assessment,
    CefrLevel,
    ContentReview,
    Course,
    GrammarTopic,
    LessonSection,
    ListeningItem,
    SpeakingScenario,
    VocabularyItem,
    VocabularyTranslation,
)
from app.models.exercise import Exercise
from app.models.lesson import Lesson
from app.models.unit import Unit
from app.models.user import User
from app.services.lesson_draft import build_lesson_draft, save_lesson_draft
from app.schemas.curriculum import (
    AssessmentCreate,
    AssessmentOut,
    CourseCreate,
    CourseOut,
    ExerciseCmsCreate,
    ExerciseCmsOut,
    GenerateLessonRequest,
    GrammarCreate,
    GrammarOut,
    LessonCmsCreate,
    LessonCmsOut,
    LessonDraft,
    LevelOut,
    ListeningCreate,
    ListeningOut,
    OverviewOut,
    SectionCreate,
    SectionOut,
    SpeakingCreate,
    SpeakingOut,
    StatusChange,
    UnitCmsCreate,
    UnitCmsOut,
    VocabCreate,
    VocabOut,
)

router = APIRouter()

ENTITY_MODELS = {
    "courses": Course,
    "units": Unit,
    "lessons": Lesson,
    "exercises": Exercise,
    "grammar": GrammarTopic,
    "vocabulary": VocabularyItem,
    "listening": ListeningItem,
    "speaking": SpeakingScenario,
    "assessments": Assessment,
    "sections": LessonSection,
}


def _require_status(value: str) -> str:
    if value not in CONTENT_STATUSES:
        raise HTTPException(status_code=422, detail=f"Unknown status '{value}'")
    return value


@router.get("/overview", response_model=OverviewOut)
def overview(_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> OverviewOut:
    drafts = db.scalar(select(func.count()).select_from(Lesson).where(Lesson.status == "draft")) or 0
    published = db.scalar(select(func.count()).select_from(Lesson).where(Lesson.status == "published")) or 0
    return OverviewOut(
        levels=db.scalar(select(func.count()).select_from(CefrLevel)) or 0,
        courses=db.scalar(select(func.count()).select_from(Course)) or 0,
        units=db.scalar(select(func.count()).select_from(Unit)) or 0,
        lessons=db.scalar(select(func.count()).select_from(Lesson)) or 0,
        exercises=db.scalar(select(func.count()).select_from(Exercise)) or 0,
        drafts=drafts,
        published_lessons=published,
    )


@router.get("/meta")
def meta(_admin: User = Depends(get_current_admin)) -> dict:
    return {
        "statuses": list(CONTENT_STATUSES),
        "levels": list(CEFR_CODES),
        "exercise_types": list(EXERCISE_TYPES),
        "unit_01_lessons": [
            {"order": n, "title": title, "exercises": kinds} for n, title, kinds in A1_UNIT_01_LESSONS
        ],
    }


@router.post("/bootstrap", response_model=dict)
def bootstrap_a1(_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> dict:
    """Create CEFR levels, A1 course, and Unit 01 with 10 lessons if missing."""
    for code, name, description, order in LEVEL_SEED:
        if db.get(CefrLevel, code) is None:
            db.add(CefrLevel(code=code, name=name, description=description, sort_order=order))
    db.flush()

    course = db.scalar(select(Course).where(Course.title == "A1 English"))
    if course is None:
        course = Course(
            level_code="A1",
            title="A1 English",
            description="First release: introducing yourself and basic communication.",
            status="draft",
            order_index=1,
        )
        db.add(course)
        db.flush()

    unit = db.scalar(select(Unit).where(Unit.title == "Introducing Yourself"))
    if unit is None:
        unit = Unit(
            title="Introducing Yourself",
            order_index=1,
            course_id=course.id,
            level_code="A1",
            description="A1 Unit 01",
            outcome="The learner can introduce themselves and hold a short conversation.",
            status="draft",
        )
        db.add(unit)
        db.flush()
    else:
        unit.course_id = unit.course_id or course.id
        unit.level_code = unit.level_code or "A1"

    created_lessons = 0
    for order, title, _kinds in A1_UNIT_01_LESSONS:
        exists = db.scalar(select(Lesson).where(Lesson.unit_id == unit.id, Lesson.title == title))
        if exists is None:
            db.add(
                Lesson(
                    unit_id=unit.id,
                    title=title,
                    icon_name="book",
                    order_index=order,
                    summary=_kinds,
                    status="draft",
                )
            )
            created_lessons += 1

    db.commit()
    return {"course_id": course.id, "unit_id": unit.id, "lessons_created": created_lessons}


@router.get("/levels", response_model=list[LevelOut])
def list_levels(_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> list[CefrLevel]:
    return list(db.scalars(select(CefrLevel).order_by(CefrLevel.sort_order)).all())


@router.get("/courses", response_model=list[CourseOut])
def list_courses(_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> list[Course]:
    return list(db.scalars(select(Course).order_by(Course.order_index, Course.id)).all())


@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Course:
    if db.get(CefrLevel, payload.level_code) is None:
        raise HTTPException(status_code=422, detail="Unknown CEFR level. Run bootstrap first.")
    _require_status(payload.status)
    course = Course(**payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/units", response_model=list[UnitCmsOut])
def list_units(_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> list[Unit]:
    return list(db.scalars(select(Unit).order_by(Unit.order_index, Unit.id)).all())


@router.post("/units", response_model=UnitCmsOut, status_code=status.HTTP_201_CREATED)
def create_unit(
    payload: UnitCmsCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Unit:
    _require_status(payload.status)
    unit = Unit(**payload.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/lessons", response_model=list[LessonCmsOut])
def list_lessons(_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> list[Lesson]:
    return list(db.scalars(select(Lesson).order_by(Lesson.unit_id, Lesson.order_index, Lesson.id)).all())


@router.post("/lessons", response_model=LessonCmsOut, status_code=status.HTTP_201_CREATED)
def create_lesson(
    payload: LessonCmsCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Lesson:
    if db.get(Unit, payload.unit_id) is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    _require_status(payload.status)
    lesson = Lesson(**payload.model_dump())
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.post("/sections", response_model=SectionOut, status_code=status.HTTP_201_CREATED)
def create_section(
    payload: SectionCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> LessonSection:
    if db.get(Lesson, payload.lesson_id) is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    row = LessonSection(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/sections", response_model=list[SectionOut])
def list_sections(
    lesson_id: int | None = None,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[LessonSection]:
    stmt = select(LessonSection).order_by(LessonSection.order_index, LessonSection.id)
    if lesson_id is not None:
        stmt = stmt.where(LessonSection.lesson_id == lesson_id)
    return list(db.scalars(stmt).all())


@router.get("/exercises", response_model=list[ExerciseCmsOut])
def list_exercises(
    lesson_id: int | None = None,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[Exercise]:
    stmt = select(Exercise).order_by(Exercise.order_index, Exercise.id)
    if lesson_id is not None:
        stmt = stmt.where(Exercise.lesson_id == lesson_id)
    return list(db.scalars(stmt).all())


@router.post("/exercises", response_model=ExerciseCmsOut, status_code=status.HTTP_201_CREATED)
def create_exercise(
    payload: ExerciseCmsCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Exercise:
    if db.get(Lesson, payload.lesson_id) is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if payload.type not in EXERCISE_TYPES and payload.type not in ("drag-drop-match",):
        raise HTTPException(status_code=422, detail="Unsupported exercise type")
    _require_status(payload.status)
    row = Exercise(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/grammar", response_model=list[GrammarOut])
def list_grammar(_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> list[GrammarTopic]:
    return list(db.scalars(select(GrammarTopic).order_by(GrammarTopic.id)).all())


@router.post("/grammar", response_model=GrammarOut, status_code=status.HTTP_201_CREATED)
def create_grammar(
    payload: GrammarCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> GrammarTopic:
    row = GrammarTopic(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/vocabulary", response_model=list[VocabOut])
def list_vocab(_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> list[VocabOut]:
    items = list(db.scalars(select(VocabularyItem).order_by(VocabularyItem.term)).all())
    out: list[VocabOut] = []
    for item in items:
        si = next((t.text for t in item.translations if t.language_code == "si"), "")
        out.append(
            VocabOut(
                id=item.id,
                term=item.term,
                level_code=item.level_code,
                lesson_id=item.lesson_id,
                part_of_speech=item.part_of_speech,
                definition=item.definition,
                example=item.example,
                status=item.status,
                translation_si=si,
            )
        )
    return out


@router.post("/vocabulary", response_model=VocabOut, status_code=status.HTTP_201_CREATED)
def create_vocab(
    payload: VocabCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> VocabOut:
    data = payload.model_dump(exclude={"translation_si"})
    item = VocabularyItem(**data)
    db.add(item)
    db.flush()
    if payload.translation_si:
        db.add(VocabularyTranslation(vocabulary_id=item.id, language_code="si", text=payload.translation_si))
    db.commit()
    db.refresh(item)
    return VocabOut(
        id=item.id,
        term=item.term,
        level_code=item.level_code,
        lesson_id=item.lesson_id,
        part_of_speech=item.part_of_speech,
        definition=item.definition,
        example=item.example,
        status=item.status,
        translation_si=payload.translation_si,
    )


@router.get("/listening", response_model=list[ListeningOut])
def list_listening(_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> list[ListeningItem]:
    return list(db.scalars(select(ListeningItem).order_by(ListeningItem.id)).all())


@router.post("/listening", response_model=ListeningOut, status_code=status.HTTP_201_CREATED)
def create_listening(
    payload: ListeningCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ListeningItem:
    row = ListeningItem(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/speaking", response_model=list[SpeakingOut])
def list_speaking(_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> list[SpeakingScenario]:
    return list(db.scalars(select(SpeakingScenario).order_by(SpeakingScenario.id)).all())


@router.post("/speaking", response_model=SpeakingOut, status_code=status.HTTP_201_CREATED)
def create_speaking(
    payload: SpeakingCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> SpeakingScenario:
    row = SpeakingScenario(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/assessments", response_model=list[AssessmentOut])
def list_assessments(_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> list[Assessment]:
    return list(db.scalars(select(Assessment).order_by(Assessment.id)).all())


@router.post("/assessments", response_model=AssessmentOut, status_code=status.HTTP_201_CREATED)
def create_assessment(
    payload: AssessmentCreate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Assessment:
    if db.get(Unit, payload.unit_id) is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    row = Assessment(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/status", response_model=dict)
def change_status(
    payload: StatusChange,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Move any CMS record through draft → review → approved → published."""
    model = ENTITY_MODELS.get(payload.entity_type)
    if model is None:
        raise HTTPException(status_code=422, detail="Unknown entity type")
    _require_status(payload.status)
    row = db.get(model, payload.entity_id)
    if row is None or not hasattr(row, "status"):
        raise HTTPException(status_code=404, detail="Content not found")
    row.status = payload.status
    db.add(
        ContentReview(
            entity_type=payload.entity_type,
            entity_id=payload.entity_id,
            status=payload.status,
            note=payload.note,
            reviewer_id=admin.id,
        )
    )
    db.commit()
    return {"entity_type": payload.entity_type, "entity_id": payload.entity_id, "status": payload.status}


@router.post("/ai/preview-lesson", response_model=LessonDraft)
def preview_lesson_draft(
    payload: GenerateLessonRequest,
    _admin: User = Depends(get_current_admin),
) -> dict:
    """Return a lesson draft for review. Nothing is written yet."""
    try:
        return build_lesson_draft(
            level_code=payload.level_code,
            unit_title=payload.unit_title,
            lesson_topic=payload.lesson_topic,
            exercise_count=payload.exercise_count,
            exercise_types=payload.exercise_types,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/ai/save-draft", response_model=dict)
def save_generated_draft(
    payload: LessonDraft,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Save the edited JSON draft. Status stays generated until a reviewer publishes it."""
    try:
        return save_lesson_draft(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/ai/generate-lesson", response_model=dict)
def generate_lesson_draft(
    payload: GenerateLessonRequest,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    """
    Save an AI-style lesson as draft. Does not publish.

    This builds a structured draft locally so authors can review it.
    A provider call can replace the question templates later.
    """
    try:
        draft = LessonDraft.model_validate(
            build_lesson_draft(
                level_code=payload.level_code,
                unit_title=payload.unit_title,
                lesson_topic=payload.lesson_topic,
                exercise_count=payload.exercise_count,
                exercise_types=payload.exercise_types,
            )
        )
        return save_lesson_draft(db, draft)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
