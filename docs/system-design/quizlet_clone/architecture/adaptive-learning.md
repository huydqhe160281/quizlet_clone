# Basic Design Delta — Adaptive Learning Architecture

## 1. Overview

Phase 1 Adaptive Learning Coach sits above existing SRS and study-session services. It does not replace SM-2; it **plans** the day and **routes** into spaced review or set-scoped LEARN sessions.

## 2. Components

```
Browser (authenticated)
  → /today (RSC shell + TodayPageClient)
  → GET /api/v1/today
       → learning service
            → queue (due / weak / new + rank + cap)
            → goal progress (UserStats.dailyGoalCards + ReviewHistory UTC day)
            → insights (7d reviews/accuracy, streak, weak sets)
            → recommendation (spaced | set-session | empty)
  → PATCH /api/v1/user/study-goals → UserStats.dailyGoalCards
  → CTA
       → /study?source=today  OR
       → POST /api/v1/study/sessions (setId, LEARN) → /sets/{setId}/learn?sessionId=…
  ← Dashboard DueCardsAlert → /today
  ← Sidebar / MobileNav → /today
```

## 3. Data

| Store                              | Use                                                     |
| ---------------------------------- | ------------------------------------------------------- |
| `CardProgress`                     | Due + ease for weak signal                              |
| `ReviewHistory`                    | Goal progress (UTC day); weak recent fails; 7d insights |
| `UserStats`                        | `dailyGoalCards` (new); streak reuse                    |
| `Flashcard` + owned `FlashcardSet` | New cards; set titles                                   |
| `StudySession`                     | Unchanged contract; set-scoped create/resume            |

## 4. Key Decisions

- Aggregate Today API (one round-trip) over many micro-endpoints for v1.
- UTC day alignment with existing streak helpers; timezone preference deferred.
- No cross-set session model; recommendation is a 2-branch deterministic rule (multi-set → spaced, single-set → LEARN); no partial-dominance threshold branch in Phase 1.
- Goal progress = reviews only (no session_card double-count).
- All thresholds/weights are named constants (`src/server/services/learning/constants.ts`); `reason`/`recommendation.kind` are shared TS unions (`src/features/today/types.ts`) — no magic numbers/strings duplicated across layers.
- `/today` and study-goals responses are `private, no-store` — never behind the shared `public-sets`/`sets-${userId}` cache tags.

## 5. Module Layout (target)

- `src/server/services/learning/` — queue, goals, insights, recommendation
- `src/features/today/` — page client, hooks, query keys
- `src/app/api/v1/today/route.ts`
- `src/app/api/v1/user/study-goals/route.ts`
- Prisma migration: `UserStats.dailyGoalCards Int @default(20)`

## 6. Related Specs

`../specs/daily-learning-queue`, `daily-study-goals`, `retention-insights`, `recommended-study-session`, `today-learning-page`, `dashboard-search-library` (delta).
