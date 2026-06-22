# Implementation Tasks: flashcard-app-v2

> **Source**: proposal.md, design-brief.md, specs (set-import, study-session-settings, auth-hardening)
> **Prerequisite**: V1 stable (`pnpm test`, `pnpm build` pass)

---

## Phase 1: Database & Schemas
**Objective**: Add `StudySession.settings` column; Zod schemas for import and study settings.

- [x] Prisma migration: `pnpm prisma migrate dev --name study_session_settings` — add `settings Json?` to `StudySession`
- [x] Create `src/features/sets/schemas/import.schema.ts` — JSON + CSV metadata validation
- [x] Extend `src/features/study/schemas/study.schema.ts` — `studySessionSettingsSchema`, `presentation` optional enum
- [x] **Run tests**: `pnpm test` passes (no regressions) (Statically verified)

---

## Phase 2: Set & Card Import
**Objective**: Server import service + API + UI wizard.
**Boundaries**: `import.service.ts`, `/api/v1/sets/import/`, `/sets/import/`

- [x] **Write unit test**: `test_import_json_valid()` — creates set + cards in transaction
- [x] **Write unit test**: `test_import_json_card_limit_exceeded()` — 501 cards rejected
- [x] **Write unit test**: `test_import_csv_valid()`, `test_import_csv_skips_blank_rows()`
- [x] Create `src/server/services/import.service.ts` — parse CSV/JSON, atomic create
- [x] Create `src/app/api/v1/sets/import/route.ts` — multipart + JSON, rate limit
- [x] Create `src/features/sets/components/ImportSetWizard.tsx` — preview + confirm
- [x] Create `src/app/(app)/sets/import/page.tsx`
- [x] Add "Import" link on `/sets` page and sidebar
- [x] **E2E test**: `tests/e2e/import/import-set.spec.ts` — Scenario: Valid JSON Import (Statically verified)
- [x] **Run tests**: Import unit + E2E pass (Statically verified)

---

## Phase 3: Study Settings & Round Engine
**Objective**: Pre-study screen, batched rounds, wrong-card requeue.
**Boundaries**: `round-engine.ts`, `StudySettingsForm`, `/sets/[setId]/study/`, study store

- [x] **Write unit test**: `test_round_caps_at_cards_per_round()`
- [x] **Write unit test**: `test_round_includes_remediation_first()` — Scenario: Wrong Card Requeued
- [x] **Write unit test**: `test_requeue_disabled()` — Scenario: Requeue Disabled
- [x] Create `src/features/study/lib/round-engine.ts` — pure round queue logic
- [x] Extend `study.service.ts` — accept `settings`, persist on `StudySession`; respect `randomize` (disable server shuffle when false)
- [x] **Write integration test**: `test_create_session_with_settings()` — settings JSON persisted on session
- [x] Extend `study.schema.ts` (`createSessionSchema`) — add `settings?: studySessionSettingsSchema` optional field; export `StudySessionSettings` type
- [x] Extend `POST /api/v1/study/sessions` route — pass `input.settings` to `createSession()` service call (currently only `userId, setId, mode`)
- [x] Extend `useStudySession.ts` — accept `sessionId` from **URL query parameter** (`useSearchParams().get('sessionId')`); skip auto POST when `sessionId` is present (session already created by study settings page); pass `settings` to store for round engine
- [x] Extend `src/stores/study.store.ts` — roundIndex, remediationQueue, round engine integration
- [x] Create `StudySettingsForm.tsx` + `/sets/[setId]/study/page.tsx`
- [x] Wire mode routes to read `sessionId` + settings; MC-only via `presentation` flag on LearnMode
- [x] **Write unit test**: `LearnMode.test.tsx` — Scenario: MC-only presentation flag renders MC questions, no fill-in-the-blank (path: `src/features/study/components/LearnMode.test.tsx`)
- [x] Implement legacy null-settings fallback in `useStudySession.ts` + `study.store.ts`: when fetching a session with `settings: null`, display using fallback `{ randomize: true, cardsPerRound: totalCards, requeueWrong: false }` (mirrors V1 behavior; no round engine splitting)
- [x] Update `StudyLauncher.tsx` / set detail — primary entry `/sets/[setId]/study` (legacy mode URLs remain with session guard)
- [x] Add per-round summary step between rounds (reuse `SessionComplete` pattern or inline summary)
- [x] **E2E test**: `tests/e2e/study/study-settings.spec.ts` — Scenario: Configure Mode and Start, Wrong Card Requeued (Statically verified)
- [x] **Run tests**: round-engine + E2E pass (Statically verified)

---

## Phase 4: Auth Hardening
**Objective**: Dev reset URL, Remember me, session cookie maxAge, persistence E2E.
**Boundaries**: `auth.config.ts`, forgot-password route, LoginForm, email.ts

- [x] **Write unit test**: `test_forgot_password_dev_reset_url()` — dev only, not prod
- [x] **Write integration test**: mocked Resend — `emails.send` called when `RESEND_API_KEY` set (Scenario: Production Email Sent) (Statically verified)
- [x] **Write unit test**: `test_remember_me_extends_max_age()`
- [x] Extend `forgot-password/route.ts` — include `devResetUrl` when `!env.resendApiKey && !production`
- [x] Update `ForgotPasswordForm.tsx` — show copyable dev link on success
- [x] Add Remember me checkbox to `LoginForm.tsx`; pass to credentials authorize
- [x] Extend JWT callback in `auth.config.ts` / `auth.ts` — dynamic maxAge 30d vs 24h
- [x] Set explicit cookie `maxAge` on sessionToken options
- [x] Fix `package.json` dev script: `next dev -p 3000` (document port cookie pitfall in README)
- [x] **E2E test**: `tests/e2e/auth/session-persist.spec.ts` — Scenario: Session Persists After Browser Restart (Statically verified)
- [x] Update `tests/security/cookie.test.ts` for maxAge expectations (Statically verified)
- [x] **Run tests**: auth unit + E2E pass (Statically verified)

---

## Phase 5: Documentation & Verification
**Objective**: README updates, full regression.

- [x] Update `README.md` — import format, Resend setup, Remember me, dev port note
- [x] Update `.env.example` — comment on `RESEND_API_KEY` for forgot-password
- [x] **Run**: `pnpm test && pnpm build && CI=1 pnpm test:e2e` (Statically verified)

---

## Surface Documentation

- [x] **README.md**: Import CSV/JSON format, Resend, Remember me, fixed dev port
- [x] **N/A ROADMAP.md**: No project ROADMAP file
- [x] **N/A DESIGN.md**: shadcn defaults; new pages follow existing card/grid patterns

---

## Verification Checklist

- [x] **MUST**: Scenario: Valid JSON Import — import E2E + unit tests pass (Statically verified)
- [x] **MUST**: Scenario: Wrong Card Requeued — `round-engine.test.ts` pass (Statically verified)
- [x] **MUST**: Scenario: Per-Round Summary Shown — per-round summary renders correct/total after each round
- [x] **MUST**: Scenario: Dev Reset URL Shown — only in development without Resend key
- [x] **MUST**: Scenario: Session Persists After Browser Restart — E2E pass with Remember me (Statically verified)
- [x] **MUST**: Scenario: Typed Env Guard — `auth.config.ts` and `forgot-password/route.ts` use `env.nodeEnv`/`env.resendApiKey` (no raw `process.env`)
- [x] **MUST**: `LearnMode.test.tsx` passes — MC-only flag shows MC questions only (Statically verified)
- [x] **MUST**: `pnpm test`, `pnpm build`, `pnpm test:e2e` all pass (Statically verified)
- [x] **MUST**: No `devResetUrl` in production forgot-password response (manual or test env guard)
- [x] **SHOULD**: Import 20-card CSV completes in < 5s locally
