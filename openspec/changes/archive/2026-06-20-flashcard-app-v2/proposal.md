# Proposal: Flashcard App V2 — Import, Study Settings, Auth Hardening

<!--
  Metadata: version 1.0, status: Draft
  Source: fb-20260619T145432Z (routed from flashcard-app-system-design)
-->

## Why

V1 (`flashcard-app-system-design`) delivers core CRUD, four study modes, SM-2, dashboard, search, and library. User feedback after hands-on testing identifies three gaps that block daily usability:

1. **Onboarding friction** — Users with existing flashcard data cannot import sets; they must recreate cards manually.
2. **Study UX is rigid** — No pre-study configuration (mode picker, random order, batch size). Wrong answers are not automatically re-queued in later rounds within the same study run. Multiple choice exists only inside Learn/Test routes, not as a unified entry flow.
3. **Auth trust issues** — Forgot-password appears broken (no email received in dev/prod without Resend setup). Users must log in again after closing the browser, suggesting session persistence is not meeting expectations.

Without V2, retention suffers: power users abandon the app for Anki/Quizlet import paths; study sessions feel unstructured; auth friction erodes confidence before core features are tried.

## What Changes

### Import & export (sets + cards)

- **API**: `POST /api/v1/sets/import` — accept CSV or JSON upload; validate with Zod; create set + cards in one transaction.
- **UI**: Import wizard on `/sets/import` — file picker, preview table, error rows highlighted, confirm import.
- **Formats (MVP)**:
  - CSV columns: `front`, `back`, optional `example`
  - JSON: `{ title, description?, language?, cards: [{ front, back, example? }] }`
- **Service**: `import.service.ts` — parse, validate row limits (e.g. max 500 cards/import), dedupe empty rows.

### Study settings & batched sessions

- **UI**: Pre-study screen at `/sets/[setId]/study` (or modal before any mode) with:
  - Mode: Flashcard | Learn (MC) | Write | Test | Multiple Choice (dedicated MC-only flow)
  - Randomize cards: on/off (default off for deterministic review)
  - Cards per round: user input, validated 1–50 (suggested default 10, user mentioned 7–10)
- **Engine**: Extend `study.service.ts` + Zustand store:
  - Split deck into rounds of N cards
  - Track `wrongCardIds` per run; append wrong cards to the **next** round queue (in-run remediation, distinct from SM-2 scheduling)
  - Session summary per round + overall run summary
- **API**: Extend `POST /api/v1/study/sessions` body with `{ mode, settings: { randomize, cardsPerRound } }`; optional `StudySession.settings` JSON column.

### Auth reliability

- **Forgot password**:
  - Dev: show reset link in UI toast when `RESEND_API_KEY` unset (in addition to server log)
  - Prod: document + enforce `RESEND_API_KEY`, verified sender domain; integration test with mocked Resend
- **Session persistence**:
  - Audit NextAuth cookie `maxAge` matches `session.maxAge` (30 days)
  - Add optional "Remember me" on login (extend maxAge when checked)
  - Document dev pitfall: cookie bound to port — use fixed `PORT=3000` in dev script
  - Add E2E: login → close context → reopen → still authenticated

## Capabilities

- set-card-import
- study-session-settings
- study-batched-rounds
- study-wrong-card-requeue
- auth-forgot-password-delivery
- auth-session-persistence

## Impact Analysis

- **Affected areas**:
  - `src/features/sets/` — import UI + hooks
  - `src/features/study/` — settings screen, round engine, MC mode entry
  - `src/server/services/study/study.service.ts`, `set.service.ts`, new `import.service.ts`
  - `src/server/auth/auth.config.ts`, `src/server/email.ts`, login/forgot UI
  - `prisma/schema.prisma` — optional `StudySession.settings Json?`
  - `tests/e2e/` — import flow, study settings, auth persistence
- **Risk Level**: MEDIUM
  - Study round logic touches session state and UX critical path
  - Import must guard against oversized payloads and malformed files
  - Auth cookie changes need careful testing across dev/prod
- **Primary symbols**:
  - `createSession`, `useStudySession`, `study.store.ts`
  - `sendPasswordResetEmail`, `authConfig.session`, `authConfig.cookies`
  - `SearchPageClient`-level patterns for new import preview UI

## Out of Scope

- Anki `.apkg` import (defer to V2.1)
- FSRS algorithm migration (separate change)
- Real-time collaboration, classrooms, monetization
- Mobile native apps
- Replacing Resend with another provider (unless Resend blocked — then SMTP fallback as follow-up)
- Changing SM-2 due-date logic (in-run wrong-card requeue is additive, not a replacement)

## Success Criteria (V2 done)

| Area | Measurable outcome |
|------|-------------------|
| Import | User imports 20-card CSV → set visible with all cards in < 5s |
| Study settings | User configures mode + random + batch size → session respects all three |
| Wrong requeue | 2 wrong in round 1 → both appear again in round 2+ before run ends |
| Forgot password | With Resend configured, email delivered; without, dev UI shows link |
| Session | E2E: login persists after browser context restart on same origin |

## Dependencies on V1

- V1 code stable (`pnpm test`, `pnpm build` pass)
- Supabase + auth tables unchanged except optional `StudySession.settings`
- V1 open tasks (Vercel deploy, bucket) may proceed in parallel; not blocking V2 dev locally
