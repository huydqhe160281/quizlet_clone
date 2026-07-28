# Detail Design — Today Coach API & Ranking

## 1. Purpose

Specify the Phase 1 Today aggregate contract, queue ranking, goal persistence, and recommendation branching for adaptive-learning-coach.

## 2. Constants (no magic numbers)

Defined as named exports in `src/server/services/learning/constants.ts`:

| Constant                  | Value                                                                   |
| ------------------------- | ----------------------------------------------------------------------- |
| `WEAK_EASE_THRESHOLD`     | `2.0`                                                                   |
| `WEAK_LOOKBACK_DAYS`      | `7`                                                                     |
| `QUEUE_DEFAULT_LIMIT`     | `30`                                                                    |
| `QUEUE_MAX_LIMIT`         | `50`                                                                    |
| `GOAL_MIN`                | `1`                                                                     |
| `GOAL_MAX`                | `200`                                                                   |
| `GOAL_DEFAULT`            | `20`                                                                    |
| `SET_DOMINANCE_THRESHOLD` | `0.7` (reserved for future tuning; not branched on in Phase 1 — see §5) |

`reason` and `recommendation.kind` are shared TS unions in `src/features/today/types.ts`, imported by both server and client — not re-declared as raw string literals elsewhere.

**Note on `UserStats.dailyGoalCards`**: this field does **not** exist in the current schema; it is added by this change's Phase 1 migration (task 1.2). §4 below assumes the migration has landed.

## 3. `GET /api/v1/today`

**Auth**: `requireUserId()` — 401 if missing.

**Query** (optional): `limit` integer, default `QUEUE_DEFAULT_LIMIT` (30), clamped to `[1, QUEUE_MAX_LIMIT]` (50).

**Response (200)** sketch:

```json
{
  "goal": {
    "target": 20,
    "completed": 3,
    "remaining": 17,
    "pct": 15
  },
  "queue": {
    "items": [
      {
        "cardId": "…",
        "setId": "…",
        "setTitle": "…",
        "reason": "due",
        "dueDate": "ISO-8601",
        "easeFactor": 2.1,
        "frontPreview": "optional short string"
      }
    ],
    "returned": 30,
    "totalEligible": 80
  },
  "insights": {
    "reviewsLast7Days": 42,
    "accuracyLast7Days": 0.78,
    "currentStreak": 4,
    "weakSets": [{ "setId": "…", "title": "…", "count": 12 }]
  },
  "recommendation": {
    "kind": "spaced",
    "href": "/study?source=today",
    "setId": null,
    "mode": null
  }
}
```

`recommendation.kind` ∈ `spaced` | `set-session` | `empty`.

For `set-session`: include `setId`, `mode: "LEARN"`, and UI may call existing session create then navigate.

Loading this endpoint MUST NOT insert `StudySession` rows.

## 4. Queue Algorithm

1. Load due progress for user (`dueDate <= now`) **with an explicit `card.set.userId === userId` filter** (not a bare reuse of `getDueCards`, which only filters `CardProgress.userId`) — defense-in-depth against unowned-card leakage.
2. Load weak candidates: progress not in due set where `easeFactor < WEAK_EASE_THRESHOLD`, union cards with latest review in `WEAK_LOOKBACK_DAYS` graded AGAIN/HARD (exclude due duplicates), same owned-set filter.
3. Load new cards: owned flashcards without progress; exclude ids already selected.
4. Score each item using the named weights in `constants.ts` (§2):
   - overdue days (due only)
   - `(2.5 - easeFactor)` when progress exists
   - recent-fail bonus for weak
   - small boost for new
5. Sort by score DESC, then `dueDate ASC`, then `cardId ASC`.
6. Slice to `limit`; set `totalEligible` to the pre-slice length (this is the exact field name used everywhere — spec, design brief, and this doc all say `totalEligible`, never "total"/"count").
7. Build `membershipForInsights` as the uncapped due+weak candidate list (exclude `new`) for `insights.weakSets` — do **not** aggregate weak sets from capped `queue.items`.

Reason tag priority if multiple apply: **due > weak > new**.

## 5. Goals

### Schema

`UserStats.dailyGoalCards Int @default(GOAL_DEFAULT)` (20) — additive migration; not present until Phase 1 migration lands (see §2 note).

### `PATCH /api/v1/user/study-goals`

Body: `{ "dailyGoalCards": number }` Zod int, `min(GOAL_MIN)` (1), `max(GOAL_MAX)` (200).  
Authz: `userId` comes **only** from `requireUserId()` / session — the request body has no `userId` field, so a client can never target another user's goal.  
Effect: `ensureUserStats(userId)` then update field; return `{ dailyGoalCards }`.

### Progress

```
completed = COUNT(ReviewHistory WHERE userId AND reviewedAt >= startOfUtcDay(now) AND reviewedAt < startOfUtcDay(now) + 1 day)
remaining = max(target - completed, 0)
pct = target === 0 ? 0 : min(100, floor(100 * completed / target))
```

Reuse the exact `startOfUtcDay` helper already defined in `stats.service.ts` — do not re-implement UTC day math. The upper bound is **exclusive** (`< nextUtcDay`), so a review recorded at `nextUtcDay` boundary counts toward the _next_ day, not today. A brand-new user with zero `ReviewHistory` rows gets `completed = 0` (no error; `target` is always ≥ `GOAL_MIN` so no divide-by-zero).

Do not add `session_cards` into `completed` in Phase 1.

## 6. Recommendation Rules

Deterministic order, evaluated against `queue.items` (the same capped list returned to the client) and `totalEligible`:

1. If `totalEligible === 0` → `{ kind: "empty", href: "/sets" }`. No session create.
2. Else if `queue.items` contains more than one distinct `setId` → `{ kind: "spaced", href: "/study?source=today", setId: null, mode: null }`.
3. Else (exactly one distinct `setId` across `queue.items`) → `{ kind: "set-session", setId, mode: "LEARN", href: "/sets/{setId}/learn" }`.

There is no separate "≥ 70% dominance" branch in Phase 1: step 2 already routes every multi-set queue to `spaced`, so step 3 only ever fires when the queue is single-set (trivially ≥ 70%/100%). `SET_DOMINANCE_THRESHOLD` is defined in constants for possible future partial-dominance tuning but is **not read** by Phase 1 code — do not implement a branch for it.

Accepting a `set-session` CTA: client calls existing `POST /api/v1/study/sessions` with `{ setId, mode: "LEARN" }` (idempotent resume applies unchanged), then navigates to the **existing** route `/sets/{setId}/learn?sessionId={session.id}` (confirmed at `src/app/(app)/sets/[setId]/learn/page.tsx`; reached today via `StudyLauncher` → `StudySettingsModal`). No new route, no new `StudyMode`, no new session-create endpoint is introduced by this change.

## 7. Insights

- Window: now − `WEAK_LOOKBACK_DAYS` (7) UTC days through now.
- Accuracy: `(GOOD + EASY) / reviewsLast7Days` else 0.
- Streak: `getEffectiveStreak` / existing stats helpers.
- Weak sets: aggregate counts from due∪weak membership; top 3 by `count DESC`, tie-broken by `setId ASC` for determinism.

## 8. UI Integration

- Route `/today` under authenticated app layout.
- Client fetch via React Query; `useNavReselectRefetch('/today', refetch)`.
- Shared: `PageHeader`, `EmptyStatePanel`, `QueryErrorPanel`.
- i18n keys under `todayPage.*` (or `messages/*/today.json`) for vi/en/ja — parity across all three catalogs is a release gate, not optional polish.
- Nav: Sidebar + MobileNav item.
- Dashboard: `DueCardsAlert` primary link → `/today` (unconditionally, whenever `dueToday > 0`; no other CTA competes for that slot).

## 9. Caching

`GET /api/v1/today` and `PATCH /api/v1/user/study-goals` are per-user private data and MUST respond with `Cache-Control: private, no-store`. They MUST NOT be wrapped in `unstable_cache`/`revalidateTag` groups such as `public-sets` or `sets-${userId}` — those tags are for the existing sets/library caches, not for Today. Freshness comes from client refetch + `useNavReselectRefetch`, not a server cache layer.

## 10. Verification

- Unit: ranking stability, weak/due dedupe, owned-set filter on the due branch, goal UTC boundary (`reviewedAt` exactly at `nextUtcDay` excluded), zero-history goal progress, weakSets tie-break, recommendation branches (empty / multi-set / single-set) including the "no partial-dominance branch" behavior.
- API: 401 unauthenticated; PATCH validation 400 for out-of-range `dailyGoalCards`; PATCH never accepts/uses a client-supplied `userId`; Today payload shape matches §3 exactly (`totalEligible`, not `total`/`count`).
- UI: empty/error/nav-reselect states; locale keys present in all three catalogs; recommendation CTA navigates to `/sets/{setId}/learn?sessionId=…` for `set-session` and `/study?source=today` for `spaced`.
