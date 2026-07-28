# daily-study-goals Specification

## Purpose

Learners set a daily card-review target and see UTC-day progress toward that goal (Adaptive Learning Coach Phase 1).

## Requirements

### Requirement: Persist Daily Card Goal

The system SHALL store `dailyGoalCards` on `UserStats` with default **20**. Authenticated users MAY update the goal via `PATCH /api/v1/user/study-goals` with body `{ dailyGoalCards: number }` where the value is an integer in **[1, 200]**.

**Constraint**: MUST  
**Verification**: Migration presence; unit/API tests for validation bounds and persistence

#### Scenario: Default goal for existing stats row

- **GIVEN** a user with an existing `UserStats` row created before this field existed (after migration default applied)
- **WHEN** `GET /api/v1/today` returns goal
- **THEN** `goal.target` equals 20 unless the user previously patched a different value

#### Scenario: Update goal

- **GIVEN** an authenticated user
- **WHEN** they PATCH `{ "dailyGoalCards": 40 }`
- **THEN** subsequent Today payload shows `goal.target = 40`

#### Scenario: Reject out-of-range goal

- **GIVEN** an authenticated user
- **WHEN** they PATCH `{ "dailyGoalCards": 0 }` or `201`
- **THEN** the API returns 400 validation error and does not change the stored goal

#### Scenario: Unauthenticated update rejected

- **GIVEN** no session
- **WHEN** PATCH `/api/v1/user/study-goals`
- **THEN** the API returns 401

### Requirement: UTC Day Goal Progress From Reviews

The system SHALL compute goal progress for the current **UTC** calendar day as the count of `ReviewHistory` rows for the user with `reviewedAt` in `[startOfUtcDay(now), nextUtcDay)` — an **exclusive upper bound**, computed by reusing the existing `startOfUtcDay` helper from `stats.service.ts` (no separate UTC-day implementation). Progress SHALL **not** count `session_cards` answers toward the same goal in Phase 1 (avoid double-counting with non-SRS modes).

Returned shape SHALL include at least: `target`, `completed`, `remaining` (max(target − completed, 0)), and `pct` (clamped 0–100).

**Constraint**: MUST  
**Verification**: Unit tests with fixed clocks; integration against review submission incrementing `completed`

#### Scenario: Progress increments after spaced review

- **GIVEN** user target 20 and 0 reviews today (UTC)
- **WHEN** user submits one spaced `reviewCard` successfully
- **THEN** Today goal shows `completed = 1`, `remaining = 19`

#### Scenario: Session-only answers do not advance goal

- **GIVEN** user completes LEARN mode answers recorded only on `session_cards` with no `ReviewHistory` rows today
- **WHEN** Today goal is loaded
- **THEN** `completed` remains unchanged by those session answers

#### Scenario: Goal met

- **GIVEN** target 10 and 10 reviews today
- **WHEN** Today goal is loaded
- **THEN** `remaining = 0` and `pct = 100`

#### Scenario: Review exactly at next-UTC-day boundary excluded

- **GIVEN** target 20, one `ReviewHistory` row with `reviewedAt` exactly equal to `nextUtcDay` (the start of tomorrow, UTC)
- **WHEN** Today goal is loaded for the current UTC day
- **THEN** that row is **not** counted in `completed` for today (exclusive upper bound); it counts toward tomorrow's progress instead

#### Scenario: Zero-history new user

- **GIVEN** a user with no `ReviewHistory` rows at all and default `dailyGoalCards = 20`
- **WHEN** Today goal is loaded
- **THEN** `completed = 0`, `remaining = 20`, `pct = 0`, and no divide-by-zero or error occurs

### Requirement: Goal Mutations Are Self-Scoped

`PATCH /api/v1/user/study-goals` SHALL derive the target user exclusively from the authenticated session (`requireUserId()`). The request body SHALL NOT contain a `userId` field, and any `userId` value present in the body SHALL be ignored — a user can never update another user's goal by supplying a different id.

**Constraint**: MUST  
**Verification**: API test asserting a body containing an unrelated `userId` still updates only the session user's `UserStats` row

#### Scenario: Body-supplied userId is ignored

- **GIVEN** an authenticated user A
- **WHEN** they PATCH `{ "dailyGoalCards": 30, "userId": "user-b" }`
- **THEN** only user A's `UserStats.dailyGoalCards` is updated to 30; user B's row is untouched
