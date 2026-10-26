# English Development App

[![React Native](https://img.shields.io/badge/Mobile-React_Native_(Expo)-61DAFB?logo=react)](https://reactnative.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Admin-Next.js_14-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![OpenAI](https://img.shields.io/badge/AI-OpenAI_(Whisper_·_GPT_·_TTS)-412991?logo=openai)](https://openai.com/)

> A complete software ecosystem that helps beginners practice and improve spoken English through a real-time, voice-to-voice AI tutor — plus a private Admin Panel for operators.

---

## Project Overview & Vision

**English Development App** is built for learners who want to speak English with confidence. The core experience is a **real-time voice-to-voice conversation with an AI tutor**: the user speaks into the phone, the AI understands their speech, replies with a natural human-like voice, and simultaneously corrects grammar and pronunciation.

Beyond conversation practice, the product includes a **visual learning path** (units and lessons, game-map style) and **interactive exercises** (drag-and-drop, fill-in-the-blanks). Business owners manage the whole system from a **web Admin Panel** — users, payments, AI usage, and curriculum — without needing to ship a new app build for every content change.

### Vision

- Make spoken English practice available anytime, anywhere.
- Give beginners a patient AI tutor that listens, speaks, and corrects in real time.
- Give operators clear visibility into growth, revenue, and engagement — and tools to grow the curriculum.

---

## The 3-Tier Architecture

This repository is a **monorepo** for three cooperating applications:

```text
┌─────────────────────┐         ┌──────────────────────────────┐         ┌─────────────────────┐
│   Mobile App        │         │   Backend & AI (Brain)       │         │   Admin Panel       │
│   React Native      │◄───────►│   Python FastAPI             │◄───────►│   Next.js 14        │
│   (Expo)            │  HTTPS  │   PostgreSQL + OpenAI        │  HTTPS  │   (private web)     │
│   Students / Users  │         │   Whisper · GPT · TTS        │         │   Admins / Owners   │
└─────────────────────┘         └──────────────────────────────┘         └─────────────────────┘
```

| Tier | Audience | Role |
| --- | --- | --- |
| **Mobile App** | Students | Learning UI, microphone capture, play AI voice replies, exercises & learning path |
| **Backend & AI** | System | Auth, data, progress, payments; speech→text→LLM→TTS; grammar corrections |
| **Admin Panel** | App admins / business owners | Users, revenue, AI usage monitoring, content management (lessons & exercises) |

### How the voice loop works

1. User taps the microphone in the **mobile app** and speaks.
2. Audio is sent to the **FastAPI backend**.
3. Backend converts speech → text (**OpenAI Whisper**).
4. Backend generates a reply + corrections (**GPT-4o-mini**).
5. Backend converts reply text → speech (**OpenAI TTS**).
6. Mobile app plays the AI voice and shows corrections to the learner.

All durable data (users, progress, payments, content) lives in **PostgreSQL** behind the FastAPI API. Both the mobile app and the Admin Panel are clients of that API.

---

## Repository Folder Structure

There are **three main folders** at the repository root — one per tier:

```text
english development App/
├── README.md                 # ← You are here (ecosystem overview)
├── mobile-app/               # React Native (Expo) + TypeScript — learner client
├── backend/                  # Python FastAPI + PostgreSQL + OpenAI — API & AI
└── admin-panel/              # Next.js 14 + Tailwind + shadcn/ui — operator dashboard
```

| Folder | Stack | Purpose |
| --- | --- | --- |
| [`mobile-app/`](./mobile-app/) | React Native (Expo), TypeScript | App students download; learning path, exercises, voice AI chat |
| [`backend/`](./backend/) | FastAPI, PostgreSQL, OpenAI (Whisper, GPT, TTS) | Auth, business logic, AI pipeline, database |
| [`admin-panel/`](./admin-panel/) | Next.js 14, Tailwind CSS, shadcn/ui | Private site for users, payments, AI usage, and content CRUD |

> Detailed setup for each tier lives in that folder’s own README (added as each app is scaffolded).

### Per-project documentation

| Project | Documentation |
| --- | --- |
| Mobile app | [./mobile-app/README.md](./mobile-app/README.md) |
| Backend & AI | [./backend/README.md](./backend/README.md) |
| Admin Panel | [./admin-panel/README.md](./admin-panel/README.md) |

---

## Tech Stack (Summary)

| Layer | Technologies |
| --- | --- |
| **Mobile** | React Native (Expo), TypeScript |
| **Backend** | Python FastAPI, PostgreSQL, OpenAI APIs (Whisper, GPT-4o-mini, TTS) |
| **Admin** | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| **Shared** | REST/JSON over HTTPS; JWT auth for protected admin & user APIs |

---

## Initial Setup Instructions (Developers)

Follow these steps when onboarding to the full ecosystem.

### 1. Prerequisites

Install globally (or via your preferred version managers):

- **Git**
- **Node.js** 18+ (for `mobile-app` and `admin-panel`)
- **npm** (or pnpm / yarn)
- **Python** 3.11+ and **pip** (for `backend`)
- **PostgreSQL** 14+ (local or remote)
- **Expo CLI / Expo Go** (for mobile development)
- An **OpenAI API key** (Whisper, GPT, TTS)

### 2. Clone the repository

```bash
git clone <repository-url>
cd "english development App"
```

### 3. Create the three project folders (first-time scaffold)

If the folders do not exist yet, create them from the repo root:

```bash
mkdir mobile-app backend admin-panel
```

### 4. Set up each tier

Work in this order so the API is available before the clients:

1. **Backend** — create DB, configure env, install Python deps, run FastAPI  
   → See [./backend/README.md](./backend/README.md)

2. **Admin Panel** — install Node deps, point `NEXT_PUBLIC_API_URL` at the API, run Next.js  
   → See [./admin-panel/README.md](./admin-panel/README.md)

3. **Mobile App** — install Expo deps, configure API base URL, start Expo  
   → See [./mobile-app/README.md](./mobile-app/README.md)

### 5. Typical local ports (convention)

| Service | Default URL |
| --- | --- |
| Backend (FastAPI) | `http://localhost:8000` |
| Admin Panel (Next.js) | `http://localhost:3000` |
| Mobile (Expo) | Expo Dev Tools / device or simulator |

---

## Who Uses What

| Persona | Uses |
| --- | --- |
| **Learners** | `mobile-app` — practice speaking, complete lessons & exercises |
| **Admins / owners** | `admin-panel` — users, payments, AI usage, content |
| **Engineers** | All three folders + this root README for architecture context |

---

## Roadmap (High Level)

1. Scaffold `backend` — models, auth, core Admin & mobile APIs  
2. Scaffold `admin-panel` — dashboard, users, payments, content, AI usage  
3. Scaffold `mobile-app` — learning path, exercises, voice AI session UI  
4. Wire OpenAI Whisper → GPT → TTS pipeline end-to-end  
5. Harden auth, payments, and production deployment

---

## Contributing

- Prefer small, focused changes per folder (`mobile-app`, `backend`, or `admin-panel`).
- Keep secrets out of git (use `.env` / `.env.local`; commit only `.env.example` files).
- Document breaking API changes in both the backend README and any affected client README.

---

## License

Private / proprietary — all rights reserved unless otherwise stated by the project owners.

---

## Support

1. Confirm Node, Python, and PostgreSQL versions match the prerequisites.  
2. Confirm the backend is healthy (`/health` or `/docs`) before debugging clients.  
3. Check CORS and API base URLs for Admin Panel and mobile.  
4. For OpenAI failures, verify the API key and quota.

For tier-specific issues, open the README inside that folder.
