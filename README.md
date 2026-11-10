# English Learning Platform

> **Repository mapping (this codebase).** The target layout below uses `apps/admin` and `apps/mobile`. The working monorepo already exists as:
>
> | Target | This repo |
> | --- | --- |
> | `apps/mobile` | `mobile-app/` (Expo, do not move) |
> | `backend/` | `backend/` (FastAPI, existing auth, units, lessons, exercises, AI chat, payments) |
> | `apps/admin` | `admin-panel/` (Next.js curriculum CMS) |
>
> Existing student APIs stay at `/api/content`, `/api/auth`, `/api/ai`, `/api/payments`. New curriculum management lives at `/api/admin/curriculum` and does not replace those routes. Primary keys stay integers so the mobile app keeps working. New curriculum tables hang off `courses` → existing `units` → `lessons` → `exercises`.
>
> Content workflow statuses: `draft`, `generated`, `under_review`, `changes_requested`, `approved`, `published`, `archived`. Existing seeded lessons default to `published`.

## Project Architecture, Technical Blueprint & Development Guide

**Project type:** Full-stack English-learning platform\
**Primary goal:** Deliver a structured, high-quality English curriculum
from CEFR A1 to C2, supported by interactive exercises, listening,
speaking, pronunciation practice, AI tutoring and measurable learner
progress.

**Technology stack** - **Mobile application:** React Native + Expo +
TypeScript - **Admin panel:** Next.js + TypeScript - **Backend API:**
Python + FastAPI - **Database:** PostgreSQL - **Database migrations:**
Alembic - **API contract:** REST + OpenAPI - **Testing:** Pytest,
Vitest/Jest, React Native Testing Library, Playwright - **Development
orchestration:** Docker Compose - **AI coding assistant:** Cursor

> This README is the project's source-of-truth architecture document.
> Cursor should read it before making architectural or implementation
> decisions. Do not build the entire platform in one generation.
> Implement it in reviewed, testable milestones.

------------------------------------------------------------------------

# 1. Product Vision

Build a comprehensive English-learning platform that helps learners
progress from beginner to proficient English through a structured and
adaptive learning experience.

The product combines: 1. Structured CEFR courses (A1, A2, B1, B2, C1,
C2). 2. Grammar explanations and guided practice. 3. Vocabulary learning
and spaced repetition. 4. Interactive exercise types. 5. Listening
comprehension and dictation. 6. Speaking and pronunciation practice. 7.
AI-supported real-life conversations. 8. Reading and writing activities.
9. Unit tests and placement assessments. 10. Learning analytics, goals,
streaks and revision.

## 1.1 Product principles

-   **Learning quality before content quantity:** every published item
    must be accurate, level-appropriate and reviewed.
-   **Outcome-based curriculum:** every unit and lesson must have
    explicit learning objectives.
-   **Practice and feedback:** learners should understand why an answer
    is right or wrong.
-   **Progressive difficulty:** new learning should build on previously
    taught knowledge.
-   **Accessible learning:** support readable layouts,
    captions/transcripts and optional Sinhala explanations; design for
    future Tamil support.
-   **Privacy and safety:** protect learner data, audio recordings and
    AI conversation history.
-   **Free-first content strategy:** core lessons and deterministic
    exercises should not require paid AI calls. AI features may have
    configurable limits and infrastructure costs.

## 1.2 Intended learners

-   Beginners learning basic English.
-   Students improving school, academic or general English.
-   Adults improving everyday communication.
-   Job seekers preparing for interviews.
-   Professionals learning workplace and business English.
-   Advanced learners improving fluency, accuracy and comprehension.

------------------------------------------------------------------------

# 2. Scope and Release Strategy

Do not attempt to publish all six CEFR levels at the beginning.

## Release 1 --- Foundation MVP

-   User registration, login and profile.
-   A1 curriculum structure.
-   First 5 complete A1 units.
-   Lesson content player.
-   Core exercise engine.
-   Answer checking and explanations.
-   Lesson completion and progress tracking.
-   Admin content management.
-   Content draft/review/approval/publish workflow.
-   Basic automated tests and CI checks.

## Release 2 --- Full A1 and A2

-   Remaining A1 content.
-   A2 course.
-   Vocabulary review and spaced repetition.
-   Listening audio and comprehension.
-   Unit assessments.
-   Daily goals and streaks.

## Release 3 --- Speaking and AI

-   Voice recording and playback.
-   Speech-to-text integration.
-   AI conversation scenarios.
-   AI feedback with structured output.
-   Pronunciation analysis where a reliable speech service is available.
-   Usage limits, consent and retention controls.

## Release 4 --- B1 and B2

-   Intermediate and upper-intermediate courses.
-   Longer reading and listening tasks.
-   Writing practice and feedback.
-   Workplace and interview English.

## Release 5 --- C1 and C2

-   Advanced and proficient curriculum.
-   Nuanced vocabulary and discourse.
-   Advanced writing, presentations and discussion.
-   More sophisticated assessments.

**Release gate:** a level or unit is not considered complete merely
because records exist. It must pass content review, functional tests,
accessibility checks and learner usability review.

------------------------------------------------------------------------

# 3. System Architecture Overview

## 3.1 High-level architecture

``` mermaid
flowchart TB
    Learner[React Native Mobile App]
    Admin[Next.js Admin Panel]
    API[FastAPI Backend]
    DB[(PostgreSQL)]
    Storage[Object Storage: Audio / Images]
    AI[Optional AI and Speech Providers]
    Worker[Background Worker]
    Monitoring[Logs / Metrics / Error Tracking]

    Learner -->|HTTPS REST API| API
    Admin -->|HTTPS REST API| API
    API --> DB
    API --> Storage
    API --> AI
    API --> Worker
    Worker --> DB
    Worker --> Storage
    Worker --> AI
    API --> Monitoring
    Worker --> Monitoring
```

## 3.2 Architecture rules

-   Mobile and admin applications must communicate with FastAPI.
-   Only the backend may access PostgreSQL directly.
-   Never put database credentials, AI provider secrets or private
    storage credentials in either frontend.
-   Keep business rules in the backend, not duplicated across clients.
-   Keep educational content in the database, not hardcoded in React
    components.
-   Use API request/response schemas and versioned endpoints.
-   Use database migrations for every schema change.
-   Store large audio/image files in object storage; store metadata and
    references in PostgreSQL.
-   AI provider integrations must sit behind backend service interfaces
    so providers can be changed later.
-   Use background jobs for slow tasks such as audio processing, AI
    analysis, notifications and report generation.
-   Begin with a modular monolith. Do not introduce microservices until
    there is a proven scaling need.

## 3.3 Main components

  -----------------------------------------------------------------------
  Component               Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Student mobile app      React Native, Expo,     Learning experience
                          TypeScript              

  Admin web app           Next.js, TypeScript     Curriculum and platform
                                                  management

  API                     Python, FastAPI,        Business logic and API
                          Pydantic                

  Database                PostgreSQL              Users, curriculum,
                                                  attempts, progress

  Migrations              Alembic                 Versioned database
                                                  schema

  File storage            S3-compatible object    Audio and images
                          storage                 

  Background jobs         Start with a worker     Async processing
                          interface; add          
                          Celery/RQ only when     
                          needed                  

  AI adapter              Python service          LLM and speech
                          interfaces              integrations

  Tests                   Pytest, Vitest/Jest,    Quality assurance
                          Playwright              
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 4. Recommended Repository Structure

Use a monorepo so Cursor can understand the complete system and shared
documentation.

``` text
english-learning-platform/
│
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── .gitignore
├── .editorconfig
├── .env.example
├── docker-compose.yml
├── Makefile
│
├── docs/
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── decisions.md
│   │   ├── data-flow.md
│   │   └── deployment.md
│   ├── product/
│   │   ├── product-requirements.md
│   │   ├── user-journeys.md
│   │   └── accessibility.md
│   ├── curriculum/
│   │   ├── cefr-framework.md
│   │   ├── content-standard.md
│   │   ├── lesson-template.md
│   │   └── review-checklist.md
│   ├── database/
│   │   ├── erd.md
│   │   └── data-dictionary.md
│   ├── api/
│   │   └── conventions.md
│   ├── testing/
│   │   ├── test-strategy.md
│   │   └── release-checklist.md
│   └── cursor/
│       ├── project-instructions.md
│       └── task-workflow.md
│
├── apps/
│   ├── admin/                    # Next.js admin panel
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── curriculum/
│   │   │   │   ├── courses/
│   │   │   │   ├── units/
│   │   │   │   ├── lessons/
│   │   │   │   ├── exercises/
│   │   │   │   ├── vocabulary/
│   │   │   │   ├── grammar/
│   │   │   │   ├── media/
│   │   │   │   ├── assessments/
│   │   │   │   ├── ai-content/
│   │   │   │   ├── review/
│   │   │   │   ├── users/
│   │   │   │   └── analytics/
│   │   │   ├── lib/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── styles/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   └── mobile/                   # React Native / Expo app
│       ├── assets/
│       ├── src/
│       │   ├── app/
│       │   ├── navigation/
│       │   ├── components/
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   ├── onboarding/
│       │   │   ├── lessons/
│       │   │   ├── exercises/
│       │   │   ├── vocabulary/
│       │   │   ├── listening/
│       │   │   ├── speaking/
│       │   │   ├── progress/
│       │   │   └── profile/
│       │   ├── services/
│       │   ├── hooks/
│       │   ├── store/
│       │   ├── types/
│       │   ├── theme/
│       │   └── utils/
│       ├── tests/
│       └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   ├── logging.py
│   │   │   └── exceptions.py
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   └── v1/
│   │   │       ├── router.py
│   │   │       └── endpoints/
│   │   ├── models/               # SQLAlchemy database models
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── repositories/         # Database queries
│   │   ├── services/             # Business rules
│   │   ├── domain/               # Domain logic and enums
│   │   ├── integrations/
│   │   │   ├── ai/
│   │   │   ├── speech/
│   │   │   └── storage/
│   │   ├── workers/
│   │   └── utils/
│   ├── alembic/
│   │   └── versions/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── api/
│   │   └── factories/
│   ├── pyproject.toml
│   └── Dockerfile
│
├── packages/
│   └── api-contracts/            # Optional generated API types/schemas
│
├── infrastructure/
│   ├── docker/
│   ├── scripts/
│   └── deployment/
│
└── .cursor/
    └── rules/
        ├── project.mdc
        ├── backend.mdc
        ├── admin.mdc
        ├── mobile.mdc
        ├── database.mdc
        └── testing.mdc
```

**Note:** Create only folders needed for the current milestone. This is
the target structure, not a requirement to create dozens of empty
folders immediately.

------------------------------------------------------------------------

# 5. Technology and Skills Requirements

## 5.1 Python and FastAPI

### Required skills

  Skill                 Required knowledge
  --------------------- ------------------------------------------
  Python fundamentals   Types, functions, modules, exceptions
  OOP and design        Classes, composition, interfaces
  Type hints            Typed functions, generics, protocols
  FastAPI               Routers, dependencies, middleware
  Pydantic              Validation and serialization
  SQLAlchemy            ORM, relationships, transactions
  Alembic               Database migrations
  Authentication        Password hashing, JWT or secure sessions
  REST API              HTTP methods, status codes, pagination
  Async Python          Async/await and I/O
  Pytest                Unit and integration testing
  Security              Validation, authorization, secrets
  Logging               Structured logs and error handling

### Backend responsibilities

-   Authentication and authorization.
-   Course, unit and lesson delivery.
-   Exercise retrieval and answer evaluation.
-   Attempt recording and scoring.
-   Vocabulary revision scheduling.
-   Learner progress.
-   Assessments and results.
-   AI and speech provider orchestration.
-   Admin content workflow.
-   Analytics and reporting.

### Backend design pattern

Use:

**Router → Schema → Service → Repository → Database**

Example:

``` text
POST /api/v1/exercises/{exercise_id}/submit
                  |
                  v
           API Router
                  |
                  v
        Request Validation
                  |
                  v
          Exercise Service
                  |
                  v
         Answer Evaluation
                  |
                  v
          Repository Layer
                  |
                  v
             PostgreSQL
```

Do not place all database queries and business rules inside route
functions.

## 5.2 Next.js Admin Panel

### Required skills

  Skill                      Required knowledge
  -------------------------- --------------------------------
  JavaScript / TypeScript    Strong fundamentals
  React                      Components, props, hooks
  Next.js                    App Router, layouts, routing
  Server/client components   Correct component boundaries
  Forms                      Validation and submission
  API integration            FastAPI communication
  State management           Local state and shared state
  Authentication             Protected admin routes
  UI components              Reusable component design
  Tables                     Filtering, sorting, pagination
  File uploads               Audio and image upload
  Testing                    Vitest/Jest and Playwright

### Admin modules

1.  Dashboard.
2.  Curriculum management.
3.  CEFR level management.
4.  Course management.
5.  Unit management.
6.  Lesson builder.
7.  Grammar management.
8.  Vocabulary management.
9.  Exercise question builder.
10. Listening content manager.
11. Speaking scenario manager.
12. Assessment builder.
13. AI content generation.
14. Content review and approval.
15. Student management.
16. Reports and analytics.
17. Admin roles and permissions.
18. Audit logs.

## 5.3 PostgreSQL

### Required skills

-   Relational database design.
-   Primary keys and foreign keys.
-   One-to-many and many-to-many relationships.
-   Normalisation.
-   Unique and check constraints.
-   Indexes and query optimisation.
-   Transactions.
-   JSONB for flexible exercise payloads where appropriate.
-   Database backups and restore.
-   EXPLAIN and query analysis.
-   Migrations and rollback planning.

Use relational columns for important searchable data. JSONB may be used
for exercise-type-specific configuration, but do not put the entire
application data model into JSON.

------------------------------------------------------------------------

# 6. Database Architecture

The database should be designed around these domains.

## 6.1 User and access domain

  Table                        Purpose
  ---------------------------- ----------------------------------
  users                        Student and admin accounts
  user_profiles                Profile and preferences
  roles                        Role definitions
  permissions                  Fine-grained permissions
  user_roles                   Role assignments
  refresh_tokens or sessions   Session management
  audit_logs                   Sensitive admin activity history

Suggested roles: - student - content_author - content_reviewer -
content_publisher - administrator - super_administrator

## 6.2 Curriculum domain

  Table                     Purpose
  ------------------------- --------------------------------------
  cefr_levels               A1 through C2
  courses                   Learning programmes
  units                     Course units
  lessons                   Individual lessons
  lesson_sections           Vocabulary, grammar, listening, etc.
  learning_objectives       Measurable outcomes
  grammar_topics            Grammar concepts
  vocabulary_items          Words and phrases
  vocabulary_translations   Localised meanings
  lesson_vocabulary         Lesson-to-vocabulary links

## 6.3 Exercise domain

  Table                    Purpose
  ------------------------ ------------------------------
  exercises                Exercise metadata and type
  exercise_items           Individual questions
  exercise_options         Answer choices
  exercise_answers         Answer definitions or keys
  exercise_media           Audio/image references
  exercise_tags            Search and classification
  exercise_attempts        Learner submissions
  exercise_attempt_items   Individual submitted answers

Use JSONB only for fields whose structure genuinely differs by exercise
type. Keep ownership, status, ordering, level, scoring and relationships
in normal relational columns.

## 6.4 Learning and progress domain

  Table                 Purpose
  --------------------- ------------------------------
  lesson_progress       Learner lesson progress
  unit_progress         Unit completion
  course_enrollments    Course participation
  learning_sessions     Learning session history
  daily_activity        Daily learning totals
  streaks               Current and best streak
  vocabulary_progress   Word mastery
  revision_schedule     Spaced repetition schedule
  assessment_attempts   Unit and level test attempts
  assessment_answers    Assessment responses

## 6.5 Speaking and AI domain

  Table                Purpose
  -------------------- ------------------------------
  speaking_scenarios   Conversation situations
  speaking_sessions    Conversation sessions
  speaking_messages    Messages and transcripts
  speech_analyses      Speech feedback
  ai_feedback          Structured learning feedback
  ai_usage_events      Usage and cost tracking

Do not retain raw audio indefinitely by default. Define consent,
retention periods, deletion procedures and access controls before
releasing voice features.

## 6.6 Content governance domain

  Table                 Purpose
  --------------------- --------------------------
  content_versions      Version history
  content_reviews       Reviewer decisions
  content_approvals     Publication approvals
  content_sources       Provenance and licensing
  content_change_logs   Change history

### Important database rules

-   Use UUID primary keys for externally exposed records.
-   Add created_at and updated_at timestamps.
-   Use foreign keys and database constraints.
-   Use indexes for frequent filters and joins.
-   Use soft deletion only where there is a genuine recovery/audit need.
-   Do not silently delete historical learner attempts.
-   Use transactions for submissions and progress updates.
-   Keep database migrations in source control.

------------------------------------------------------------------------

# 7. Exercise Engine Design

The mobile app should have a reusable exercise renderer.

## 7.1 Supported exercise types

1.  Single-choice multiple choice.
2.  Multiple-select.
3.  Fill in the blank.
4.  Matching.
5.  Drag and drop.
6.  Sentence ordering.
7.  True or false.
8.  Error correction.
9.  Translation.
10. Listening comprehension.
11. Dictation.
12. Pronunciation recording.
13. Speaking response.
14. Reading comprehension.
15. Picture description.
16. Free writing.

## 7.2 Exercise data model

Common fields:

-   id
-   lesson_id
-   exercise_type
-   title
-   instructions
-   question
-   difficulty
-   CEFR level
-   points
-   order_index
-   explanation
-   feedback rules
-   status
-   version

Exercise-specific configuration should be validated against a schema for
its type.

## 7.3 Answer evaluation

Use deterministic backend evaluation for: - Multiple choice. - Multiple
select. - True or false. - Matching. - Sentence ordering. - Exact or
normalised fill-in answers.

Use carefully designed rules or human/AI-assisted review for: -
Translation. - Free writing. - Picture description. - Open-ended
speaking.

Do not promise that every open-ended answer has only one correct
wording.

## 7.4 Feedback standard

Every evaluated exercise should return:

``` json
{
  "is_correct": false,
  "score": 0,
  "max_score": 1,
  "correct_answer": "I am a software engineer.",
  "explanation": "Use 'a' before a singular countable profession.",
  "feedback": "Good attempt. Remember the article 'a'."
}
```

This is an example API response contract, not a complete implementation.

------------------------------------------------------------------------

# 8. Content Creation and Quality Workflow

Educational content is a core product asset. It must be managed like a
reviewed publishing workflow.

## 8.1 Content lifecycle

``` mermaid
flowchart LR
    Plan[Curriculum Plan] --> Draft[Author / AI Draft]
    Draft --> Automated[Automated Validation]
    Automated --> Review[Human Review]
    Review -->|Changes needed| Draft
    Review -->|Approved| Publish[Publish]
    Publish --> Student[Student App]
    Student --> Analytics[Learner Analytics]
    Analytics --> Improve[Content Improvement]
    Improve --> Draft
```

## 8.2 Content statuses

-   draft
-   generated
-   under_review
-   changes_requested
-   approved
-   published
-   archived

Only published content should be available to learners.

## 8.3 Content quality checklist

Before publishing, verify:

-   Correct CEFR level.
-   Clear learning objectives.
-   Accurate grammar.
-   Natural and useful vocabulary.
-   Correct answer keys.
-   Explanations teach the underlying concept.
-   No duplicate or near-duplicate questions.
-   Appropriate difficulty progression.
-   Audio matches its transcript.
-   Image and audio rights are clear.
-   No culturally inappropriate or misleading content.
-   Accessibility requirements are met.
-   Content has an identified author/reviewer and version.

## 8.4 AI content generation

AI should generate drafts, not publish automatically.

A generation request should specify: - CEFR level. - Unit and lesson
objective. - Grammar scope. - Vocabulary scope. - Exercise type and
count. - Difficulty. - Language of explanations. - Output schema. -
Prohibited grammar or vocabulary not yet taught.

Validate generated content with Pydantic and automated checks. Human
reviewers must approve it before publication.

------------------------------------------------------------------------

# 9. API Architecture

Base path:

``` text
/api/v1
```

Use consistent response formats, validation errors, authentication and
pagination.

## 9.1 Authentication

``` text
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
POST   /auth/password/forgot
POST   /auth/password/reset
```

## 9.2 Curriculum

``` text
GET    /levels
GET    /courses
GET    /courses/{course_id}
GET    /units/{unit_id}
GET    /lessons/{lesson_id}
GET    /lessons/{lesson_id}/content
```

## 9.3 Exercises

``` text
GET    /lessons/{lesson_id}/exercises
GET    /exercises/{exercise_id}
POST   /exercises/{exercise_id}/attempts
GET    /attempts/{attempt_id}
```

## 9.4 Progress

``` text
GET    /progress/overview
GET    /progress/courses/{course_id}
GET    /progress/history
GET    /progress/weak-areas
```

## 9.5 Vocabulary

``` text
GET    /vocabulary
POST   /vocabulary/{vocabulary_id}/save
GET    /vocabulary/revision-due
POST   /vocabulary/{vocabulary_id}/review
```

## 9.6 Admin content management

``` text
POST   /admin/courses
POST   /admin/units
POST   /admin/lessons
POST   /admin/exercises
PATCH  /admin/lessons/{lesson_id}
POST   /admin/content/{content_id}/submit-review
POST   /admin/content/{content_id}/approve
POST   /admin/content/{content_id}/publish
```

## 9.7 Speaking

``` text
GET    /speaking/scenarios
POST   /speaking/sessions
POST   /speaking/sessions/{session_id}/messages
POST   /speaking/sessions/{session_id}/analyse
GET    /speaking/sessions/{session_id}/feedback
```

Admin routes must enforce permissions on the backend. Hiding an admin
button in the frontend is not security.

------------------------------------------------------------------------

# 10. Testing Strategy

Testing is mandatory. A feature is not complete because it works once on
a developer's computer.

## 10.1 Testing tools

  -----------------------------------------------------------------------
  Area                                Tool
  ----------------------------------- -----------------------------------
  Python unit tests                   Pytest

  API integration tests               Pytest + HTTPX

  Database tests                      PostgreSQL test database

  Python coverage                     Coverage.py

  Admin unit/component tests          Vitest + React Testing Library

  Admin end-to-end tests              Playwright

  Mobile unit/component tests         Jest or Vitest where compatible +
                                      React Native Testing Library

  Mobile end-to-end tests             Maestro or Detox

  API contract checks                 OpenAPI schema and contract tests

  Security checks                     Dependency audit, static analysis

  Load tests                          Locust or k6
  -----------------------------------------------------------------------

Choose and standardise compatible versions during project setup. Do not
install every testing framework without a use case.

## 10.2 Backend test categories

### Unit tests

Test individual business rules: - Answer evaluation. - Score
calculation. - Lesson completion. - Progress calculations. - Revision
scheduling. - Permission checks.

### Integration tests

Test: - FastAPI with PostgreSQL. - Repository queries. - Transactions
and rollback. - Authentication and refresh. - Exercise submissions. -
Content publication workflow.

### API tests

Test: - Valid requests. - Invalid request payloads. - Missing
authentication. - Insufficient permissions. - Missing records. -
Pagination and filtering. - Consistent error responses.

## 10.3 Admin tests

Test: - Login and protected routes. - Course and unit creation. - Lesson
editing. - Exercise creation by type. - Form validation. - Audio/image
upload. - Review and approval workflow. - Role-based access. - Search,
filter and pagination.

## 10.4 Mobile tests

Test: - Registration and login. - Course selection. - Lesson
navigation. - Exercise rendering. - Answer submission. - Correct and
incorrect feedback. - Network interruption and retry. - Offline-friendly
behaviour where supported. - Progress synchronisation. - Audio and
microphone permissions. - Screen sizes and accessibility.

## 10.5 Educational content tests

These are as important as code tests.

Test: - Correct answer matches explanation. - Questions match their CEFR
level. - No duplicate question IDs. - Required fields are present. -
Exercise options do not reveal the answer accidentally. - Audio
transcript matches the audio. - No lesson references grammar that has
not been introduced without explanation. - Assessment scores are
calculated correctly.

## 10.6 Example acceptance criteria

A lesson is ready when:

-   All content loads successfully.
-   Every exercise type renders correctly.
-   Answers are evaluated correctly.
-   Feedback is understandable.
-   Scores are calculated consistently.
-   Attempts are saved exactly once.
-   Progress updates correctly.
-   Invalid submissions are handled safely.
-   Automated tests pass.
-   Content has been reviewed and approved.

## 10.7 Coverage policy

Start with: - At least 80% coverage for critical backend business
logic. - High coverage for answer evaluation and permission logic. -
Tests for all important user journeys. - No untested critical payment,
authentication or content-publishing behaviour if those modules are
introduced.

Coverage percentages do not replace test quality.

------------------------------------------------------------------------

# 11. Security and Privacy

Security requirements:

-   Hash passwords with a modern password-hashing algorithm such as
    Argon2id.
-   Use secure token/session handling.
-   Enforce authorization on every protected backend endpoint.
-   Apply rate limits to authentication and expensive AI endpoints.
-   Validate all user input.
-   Use parameterised database queries through the ORM.
-   Store secrets in environment variables or a secret manager.
-   Never commit `.env` files.
-   Use HTTPS in production.
-   Configure CORS for known application origins.
-   Keep audit logs for important administrative changes.
-   Restrict access to learner records.
-   Define audio recording consent and retention.
-   Provide a way to delete personal data where required.
-   Avoid storing unnecessary sensitive information.
-   Back up PostgreSQL and regularly test restoration.

------------------------------------------------------------------------

# 12. Performance and Reliability

-   Add pagination to list endpoints.
-   Index common query filters and foreign keys.
-   Avoid N+1 database queries.
-   Use database connection pooling.
-   Cache only data where invalidation rules are understood.
-   Compress and optimise media.
-   Use background jobs for slow operations.
-   Add request IDs and structured logs.
-   Monitor API latency, errors and database health.
-   Implement retries carefully; avoid duplicate submissions.
-   Use idempotency keys for operations where retrying could create
    duplicate records.

Do not optimise prematurely. Measure first.

------------------------------------------------------------------------

# 13. Local Development Environment

## Prerequisites

-   Git
-   Node.js LTS
-   npm or pnpm (choose one package manager)
-   Python supported stable version
-   PostgreSQL or Docker
-   Docker Desktop
-   Cursor IDE
-   Expo Go or a development build for mobile testing

## Environment variables

Create `.env` from `.env.example`.

Example:

``` env
APP_ENV=development

DATABASE_URL=postgresql+psycopg://app_user:change_me@localhost:5432/english_learning

JWT_SECRET_KEY=replace_with_a_long_random_secret
ACCESS_TOKEN_EXPIRE_MINUTES=30

API_HOST=0.0.0.0
API_PORT=8000

NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_NETWORK_IP:8000/api/v1

STORAGE_PROVIDER=local
STORAGE_BUCKET=english-learning-media

AI_PROVIDER=disabled
AI_API_KEY=
```

Never use example secrets in production.

`localhost` inside a physical phone refers to the phone itself, not your
Mac. For a physical device, use the development computer's reachable
local network address or an approved tunnel. Do not expose the
development API publicly without appropriate protection.

## Suggested local ports

  Service                                           Port
  --------------------------- --------------------------
  Next.js admin                                     3000
  FastAPI                                           8000
  PostgreSQL                                        5432
  Optional worker dashboard     Configure only if needed

## Docker Compose services

Initially: - PostgreSQL. - FastAPI backend. - Next.js admin (optional in
Compose during local development).

Mobile Expo can run on the host machine and connect to the backend
through the host network address.

------------------------------------------------------------------------

# 14. Development Commands

Exact scripts should be confirmed when the project is scaffolded.

## Backend

``` bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -e ".[dev]"

uvicorn app.main:app --reload --port 8000
```

Run tests:

``` bash
pytest
pytest --cov=app --cov-report=term-missing
```

Run migrations:

``` bash
alembic upgrade head
```

Create a migration:

``` bash
alembic revision --autogenerate -m "describe_change"
```

Review autogenerated migrations before applying them.

## Admin

``` bash
cd apps/admin

npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

## Mobile

``` bash
cd apps/mobile

npm install
npx expo start
```

Use the scripts defined in the mobile package for linting, type-checking
and tests.

------------------------------------------------------------------------

# 15. Cursor AI Development Rules

Cursor is the AI coding assistant for this project. It must follow the
architecture and avoid making uncontrolled changes.

## 15.1 Required behaviour

1.  Read `README.md` and relevant documentation before implementing a
    task.
2.  Inspect existing files before changing them.
3.  Explain the implementation plan for significant changes.
4.  Work in small, reviewable tasks.
5.  Follow the existing code style and folder structure.
6.  Never replace the entire project to implement one feature.
7.  Never invent database columns or API endpoints without updating
    documentation and migrations.
8.  Use Pydantic schemas and TypeScript types.
9.  Keep secrets out of source control.
10. Add or update tests with every feature.
11. Run relevant tests and report actual results.
12. Do not claim tests pass unless they were executed.
13. Do not use mock data as production functionality.
14. Mark incomplete integrations clearly.
15. Ask before destructive database operations or major architectural
    changes.

## 15.2 Cursor rules files

Create these project rules:

-   `.cursor/rules/project.mdc`: overall architecture and shared
    standards.
-   `.cursor/rules/backend.mdc`: FastAPI, Python and backend patterns.
-   `.cursor/rules/admin.mdc`: Next.js and TypeScript conventions.
-   `.cursor/rules/mobile.mdc`: React Native conventions.
-   `.cursor/rules/database.mdc`: PostgreSQL and migrations.
-   `.cursor/rules/testing.mdc`: test requirements and quality gates.

## 15.3 Standard task prompt for Cursor

Use this template for each task:

``` text
Read README.md and the relevant documentation first.

Task:
[Describe one specific feature.]

Before coding:
1. Inspect the existing implementation.
2. Identify the affected frontend, backend and database files.
3. Explain the implementation plan.
4. Identify database changes and migrations.
5. Identify tests required.

Implementation:
1. Follow the established architecture.
2. Use typed interfaces and validation.
3. Keep business logic in the correct service layer.
4. Add tests.
5. Update documentation.

After implementation:
1. Run relevant tests.
2. Run lint and type checks.
3. Report files changed.
4. Report test results honestly.
5. Explain any remaining limitations.

Do not modify unrelated features.
Do not delete or replace existing project functionality.
```

------------------------------------------------------------------------

# 16. Git and Branch Strategy

Recommended branches:

-   `main` --- stable, releasable code.
-   `develop` --- integration branch.
-   `feature/...` --- individual features.
-   `bugfix/...` --- bug fixes.
-   `hotfix/...` --- urgent production fixes.

Example:

``` text
feature/curriculum-management
feature/lesson-builder
feature/exercise-engine
feature/vocabulary-review
feature/speaking-practice
bugfix/lesson-progress
```

Commit messages:

``` text
feat: add curriculum management
feat: add exercise answer evaluation
fix: prevent duplicate exercise submissions
test: add lesson completion integration tests
docs: update database architecture
refactor: separate exercise service from router
```

Require review and automated checks before merging into `main`.

------------------------------------------------------------------------

# 17. CI/CD and Deployment

## Continuous integration

On every pull request: 1. Install dependencies. 2. Run formatting and
lint checks. 3. Run Python tests. 4. Run frontend tests. 5. Run
TypeScript checks. 6. Run security/dependency checks. 7. Build admin and
mobile projects where appropriate. 8. Validate migrations.

## Deployment environments

-   Development.
-   Staging.
-   Production.

Production requirements: - Managed PostgreSQL or properly managed
database infrastructure. - HTTPS. - Secret management. - Automated
backups. - Monitoring and alerting. - Error tracking. - Database
migration procedure. - Rollback plan. - Tested restore procedure.

Do not deploy directly from an unreviewed local Cursor session.

------------------------------------------------------------------------

# 18. Project Milestones and Acceptance Criteria

  -----------------------------------------------------------------------
  Milestone               Deliverable             Completion criteria
  ----------------------- ----------------------- -----------------------
  M1                      Repository and          Project scaffold and
                          architecture            documentation

  M2                      Database foundation     Models, migrations and
                                                  test database

  M3                      Authentication          Student/admin login and
                                                  permissions

  M4                      Curriculum CMS          CEFR, courses, units
                                                  and lessons

  M5                      Exercise CMS            Question builder and
                                                  validation

  M6                      Content workflow        Draft, review, approval
                                                  and publishing

  M7                      Student lesson player   Lessons load from API

  M8                      Exercise engine         Supported exercise
                                                  types work

  M9                      Progress                Attempts, scores and
                                                  completion

  M10                     A1 content pilot        First five complete
                                                  units reviewed

  M11                     Listening               Audio and comprehension
                                                  activities

  M12                     Speaking                Voice and AI workflow

  M13                     Quality and release     Security, tests and
                                                  staging validation
  -----------------------------------------------------------------------

Each milestone should have a demonstrable working result.

------------------------------------------------------------------------

# 19. Definition of Done

A feature is complete only when:

-   Requirements are understood.
-   Implementation follows the architecture.
-   Database changes have migrations.
-   API validation and permissions are implemented.
-   UI has loading, empty, success and error states.
-   Relevant tests are written and pass.
-   Linting and type checks pass.
-   Accessibility has been considered.
-   Documentation is updated.
-   No secrets or sensitive test data are committed.
-   The feature has been reviewed.

------------------------------------------------------------------------

# 20. Immediate Next Steps for Cursor

Do these tasks in order.

## Task 1 --- Inspect and plan

Ask Cursor to inspect the repository and compare it with this
architecture. It should report: - Existing applications. - Existing
dependencies. - Existing database setup. - Existing code that can be
reused. - Missing components. - Risks and recommended changes.

It must not modify files in this first task.

## Task 2 --- Establish the monorepo

Create or organise the admin, mobile and backend applications. Add
common documentation and environment examples.

## Task 3 --- Configure PostgreSQL

Set up Docker Compose, SQLAlchemy, Alembic and a development/test
database.

## Task 4 --- Implement backend foundation

Create FastAPI configuration, health endpoint, API versioning, error
handling, logging and database connectivity.

## Task 5 --- Implement curriculum database

Create CEFR levels, courses, units, lessons, learning objectives and
lesson sections.

## Task 6 --- Build the admin curriculum module

Allow an authorised administrator to create, edit, reorder and manage
courses, units and lessons.

## Task 7 --- Implement exercise management

Add exercise types, question schemas, answer validation and the content
review workflow.

## Task 8 --- Build the mobile lesson player

Connect the mobile application to the API and display published lesson
content.

## Task 9 --- Add testing and CI

Automate tests before expanding the content library.

## Task 10 --- Create the first educational unit

Develop and review A1 Unit 01: Introducing Yourself.

------------------------------------------------------------------------

# 21. Important Architectural Decisions

  -----------------------------------------------------------------------
  Decision                Recommendation          Reason
  ----------------------- ----------------------- -----------------------
  Backend architecture    Modular monolith        Simpler to build and
                                                  maintain initially

  Database                PostgreSQL              Strong relational data
                                                  integrity

  API                     REST with OpenAPI       Easy frontend
                                                  integration

  Admin                   Next.js                 Content-management
                                                  experience

  Mobile                  React Native + Expo     Cross-platform
                                                  development

  Database access         Backend only            Security and
                                                  centralised business
                                                  logic

  Migrations              Alembic                 Versioned schema
                                                  changes

  Content                 Database-driven         Easy to manage and
                                                  expand

  AI generation           Draft and review        Educational accuracy

  AI providers            Adapter interfaces      Avoid vendor lock-in

  Media                   Object storage          Efficient audio/image
                                                  handling

  Testing                 Automated multi-layer   Reliability
                          testing                 

  Deployment              Staging before          Safer releases
                          production              
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 22. Final Project Direction

The goal is not to build a clone of another English application. The
goal is to create an independent, high-quality learning platform with:

-   A complete CEFR curriculum.
-   Carefully reviewed educational content.
-   A flexible exercise engine.
-   A powerful admin content-management system.
-   Personalised revision and progress.
-   Listening and speaking practice.
-   AI-assisted tutoring.
-   Reliable testing and maintainable architecture.

**Start with the architecture, database and content management system.
Build the first complete A1 unit only after the foundation works. Expand
gradually, with quality gates at every stage.**

Cursor should treat this README and the associated architecture
documentation as the project baseline. Any major departure must be
explained and approved before implementation.
