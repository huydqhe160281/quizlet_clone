# Design brief: flashcard-app-v2

<!--
  Metadata: version 1.0, status: Draft
  Source: proposal.md + fb-20260619T145432Z
-->

## Context

V1 ships a working flashcard platform but user feedback (`fb-20260619T145432Z`) shows three usability blockers: no import path, inflexible study flow, and auth that feels broken (no reset email, session lost on revisit). V2 is an incremental enhancement on the existing Next.js BFF + Prisma stack — no architectural pivot.

**Why now:** V1 feature-complete enough to validate UX gaps; changes are localized (3 feature areas, one optional DB column).

---

## Goals / Non-Goals

- **Goal**: Import CSV/JSON sets with preview and validation
- **Goal**: Unified pre-study settings (mode, random, batch size) with in-run wrong-card requeue
- **Goal**: Forgot-password visibly works in dev; reliably sends email in prod; session persists across browser restarts on same origin
- **Non-Goal**: Anki `.apkg`, FSRS, export, collab, native apps (see proposal Out of Scope)

---

## Decision Log

### Decision 1: Server-side import parsing

**WHAT**: `POST /api/v1/sets/import` accepts `multipart/form-data` (file) or JSON body. Parsing and validation run in `import.service.ts` on the server. Max 500 cards, max file 2MB.

**WHY**: Keeps validation authoritative (Zod + row limits), avoids trusting client-only parsing, matches existing BFF pattern.

**REJECTED**:
- *Client-only CSV parse then POST cards one-by-one*: N+1 requests, slow, no atomic rollback
- *Third-party cloud convert*: Extra dependency and cost for MVP

**API shape**:
```typescript
// POST /api/v1/sets/import
// Content-Type: application/json
{
  format: 'json',
  set: { title, description?, language?, visibility? },
  cards: [{ front, back, example? }]
}

// Content-Type: multipart/form-data
// fields: format=csv, file=<csv>, title, description?, language?, visibility?
```

**CSV rules**: Header row optional; columns `front`, `back`, `example` (case-insensitive). UTF-8. Skip blank rows. Return `{ data: { set, cardsCreated, skippedRows } }` or 400 with row-level `details`.

---

### Decision 2: Unified study entry at `/sets/[setId]/study`

**WHAT**: New page replaces direct jumps to `/flashcard`, `/learn`, etc. as the **primary** entry. Settings form → start session → redirect to mode-specific route with `sessionId` query param. Legacy mode URLs remain but show link to settings if no active session.

**WHY**: Single place for mode + random + batch configuration; matches user mental model ("configure then study").

**REJECTED**:
- *Modal on each mode page*: Duplicated settings UI × 4
- *Settings only in Zustand localStorage*: Lost on refresh, not shareable/bookmarkable

**Settings schema** (stored in `StudySession.settings` JSON + Zustand):
```typescript
type StudySessionSettings = {
  randomize: boolean;           // default false
  cardsPerRound: number;        // 1–50, default 10
  requeueWrong: boolean;        // default true — wrong cards in next round
};
```

---

### Decision 3: Round engine — client orchestration, server persistence

**WHAT**: `study.store.ts` gains round state: `roundIndex`, `roundQueue`, `remediationQueue`, `completedCardIds`. Server still creates `StudySession` + all `SessionCard` rows upfront (existing pattern). Client presents one **round** (≤ `cardsPerRound` cards) at a time.

**Round algorithm** (pure function in `src/features/study/lib/round-engine.ts`):
1. Build initial deck order (shuffle if `randomize`)
2. **Round N queue** = `[...remediationQueue, ...next slice from deck]` capped at `cardsPerRound`
3. On answer: PATCH session card `isCorrect`; if wrong and `requeueWrong`, push `cardId` to `remediationQueue` (dedupe)
4. Round complete when all cards in round answered → increment `roundIndex`, clear round queue, pull next
5. Study run complete when deck exhausted **and** `remediationQueue` empty

**WHY**: Responsive UX without round-trip per card batch; DB still has full session for dashboard/history.

**REJECTED**:
- *Server-side round API*: Extra endpoints and latency per round
- *SM-2 integration for in-run requeue*: Different concern — in-run remediation ≠ spaced repetition scheduling

---

### Decision 4: Multiple choice via LEARN mode + settings flag

**WHAT**: No new `StudyMode` enum value. "Multiple choice only" = `mode: LEARN` + `settings.presentation: 'multiple_choice'` in JSON. LearnMode component reads flag to hide fill-in-the-blank path.

**WHY**: Avoids Prisma migration for enum; Learn already implements MC.

**REJECTED**:
- *New enum `MULTIPLE_CHOICE`*: Migration + route duplication for one presentation variant

---

### Decision 5: Auth — dev-visible reset link + Remember me

**WHAT**:
1. **Forgot password**: When `RESEND_API_KEY` empty, API response includes `{ data: { message, devResetUrl? } }` (dev only, gated by `NODE_ENV !== 'production'`). UI shows copyable link in success state.
2. **Remember me**: Login form checkbox. Credentials provider passes `rememberMe` → store on JWT (`token.rememberMe`) and set session/cookie `maxAge` to 30 days if true, 24 hours if false via Auth.js `jwt` + `session` callbacks (override default 30d in `auth.config.ts` when unchecked). Use `env.nodeEnv` for prod guards, not raw `process.env`.
3. **Cookie audit**: Explicit `maxAge` on `sessionToken` cookie options matching session strategy.

**WHY**: Fixes "email never arrives" confusion in dev; gives users control over persistence; addresses port-switch pitfall via README note (`PORT=3000` fixed in `package.json` dev script).

**REJECTED**:
- *Database sessions for persistence*: Contradicts V1 Decision 4 (JWT); unnecessary for this fix
- *Always 30-day cookie*: Security trade-off for shared devices

---

## API Changes Summary

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/api/v1/sets/import` | **NEW** — import set + cards |
| `POST` | `/api/v1/study/sessions` | **EXTEND** body with `settings?: StudySessionSettings` |
| `POST` | `/api/v1/auth/forgot-password` | **EXTEND** response with optional `devResetUrl` (non-prod) |
| `POST` | `/api/auth/[...nextauth]` | **EXTEND** credentials login with `rememberMe` |

---

## Database Migration

```sql
-- migration: study_session_settings
ALTER TABLE "study_sessions" ADD COLUMN "settings" JSONB;
```

No backfill required. Legacy sessions (`settings` null) use a **display-only** fallback that mirrors V1 behavior: `{ randomize: true, cardsPerRound: totalCards, requeueWrong: false }`. This is distinct from **new session defaults** in Decision 2 (`randomize: false`, `requeueWrong: true`).

---

## UI Routes

| Route | Purpose |
|-------|---------|
| `/sets/import` | Import wizard (new) |
| `/sets/[setId]/study` | Pre-study settings (new) |
| `/sets/[setId]/flashcard?sessionId=` | Existing mode, session-aware |
| Login / Forgot | Remember me checkbox; dev reset link display |

---

## Risks / Trade-offs

- **Import malformed CSV**: User uploads wrong encoding
  → **Mitigation**: Validate UTF-8, show row errors before commit, limit 500 rows

- **Round engine complexity**: Edge cases (all wrong, single card set)
  → **Mitigation**: Pure `round-engine.ts` with 100% unit test coverage

- **Remember me + JWT**: Long-lived token if stolen
  → **Mitigation**: Default unchecked; httpOnly + SameSite=lax retained

- **Dev reset URL in API**: Leak if misconfigured in prod
  → **Mitigation**: Strict `NODE_ENV === 'production'` guard; never include in prod response

---

## Documentation Impact Analysis

**Files to be CREATED**:
- `src/server/services/import.service.ts`
- `src/features/sets/components/ImportSetWizard.tsx`
- `src/app/(app)/sets/import/page.tsx`
- `src/app/(app)/sets/[setId]/study/page.tsx`
- `src/features/study/components/StudySettingsForm.tsx`
- `src/features/study/lib/round-engine.ts` + `round-engine.test.ts`
- `openspec/changes/flashcard-app-v2/specs/*.md`
- `tests/e2e/import/import-set.spec.ts`
- `tests/e2e/study/study-settings.spec.ts`
- `tests/e2e/auth/session-persist.spec.ts`

**Files to be UPDATED**:
- `prisma/schema.prisma` — `StudySession.settings`
- `src/features/study/schemas/study.schema.ts` — settings schema
- `src/server/services/study.service.ts` — accept settings, optional shuffle control
- `src/stores/study.store.ts` — round engine integration
- `src/features/study/hooks/useStudySession.ts`
- `src/features/auth/components/LoginForm.tsx`, `ForgotPasswordForm.tsx`
- `src/server/auth.config.ts`, `src/server/auth.ts`
- `src/app/api/v1/auth/forgot-password/route.ts`
- `package.json` — `"dev": "next dev -p 3000"`
- `README.md` — Resend setup, Remember me, import format docs

---

## Migration Plan

1. `pnpm prisma migrate dev --name study_session_settings`
2. Implement `import.service.ts` + route + tests
3. Implement `round-engine.ts` + extend study store (TDD)
4. Build `/sets/[setId]/study` settings page
5. Wire mode routes to respect `sessionId` + settings
6. Auth: Remember me + dev reset URL + E2E session persist
7. Update `.env.example` with Resend notes

---

## Verification (links to proposal success criteria)

| Criterion | Test |
|-----------|------|
| Import 20 cards | `import.service.test.ts` + E2E |
| Settings respected | `round-engine.test.ts` + E2E study-settings |
| Wrong requeue | Unit test round 1 wrong → round 2 contains card |
| Forgot email | Mock Resend + dev URL assertion |
| Session persist | E2E new context same storageState |
