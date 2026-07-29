# daily-study-goals Specification

## Purpose

Learners set a daily card-review target and see progress toward that goal for the current calendar day in their preferred IANA timezone (Adaptive Learning Coach Phase 1–2).

## Engine Layer Map

| Layer     | Area        | Component/Symbol                                  |
| --------- | ----------- | ------------------------------------------------- |
| Core      | Prisma      | `UserStats.preferredTimezone`                     |
| Service   | `learning/` | `startOfZonedDay` / `getGoalProgress`             |
| Interface | API         | Today `goal.preferredTimezone`; PATCH study-goals |

## Requirements

### Requirement: Persist Daily Card Goal

The system SHALL store `dailyGoalCards` on `UserStats` with default **20**. Authenticated users MAY update the goal via `PATCH /api/v1/user/study-goals` bodies where `dailyGoalCards` and `preferredTimezone` are each optional, but the body MUST include **at least one** of them. When `dailyGoalCards` is present it MUST remain an integer in **[1, 200]**. A timezone-only PATCH SHALL update only `preferredTimezone`. A cards-only PATCH SHALL leave `preferredTimezone` unchanged.

**Constraint**: MUST  
**Verification**: Migration presence; unit/API tests for validation bounds, persistence, and partial update combinations

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

#### Scenario: Timezone-only PATCH

- **GIVEN** an authenticated user with `dailyGoalCards = 20`
- **WHEN** they PATCH `{ "preferredTimezone": "Asia/Tokyo" }`
- **THEN** timezone updates and `dailyGoalCards` remains 20

#### Scenario: Empty PATCH body rejected

- **GIVEN** an authenticated user
- **WHEN** they PATCH `{}`
- **THEN** the API returns 400

### Requirement: Persist Preferred Timezone

The system SHALL store `preferredTimezone` on `UserStats` as an IANA timezone name with default **`UTC`** (`DEFAULT_PREFERRED_TIMEZONE`). Authenticated users MAY update it via `PATCH /api/v1/user/study-goals`. Invalid timezone identifiers SHALL return **400** and leave the stored value unchanged. Validation SHALL accept `UTC`/`Etc/UTC` (normalize to `UTC`) and any id for which `Intl.DateTimeFormat(..., { timeZone })` succeeds — not bare `supportedValuesOf` membership alone (so `Asia/Ho_Chi_Minh` remains valid even when ICU lists `Asia/Saigon`).

**Constraint**: MUST  
**Verification**: Migration; API validation tests

#### Scenario: Default timezone is UTC

- **GIVEN** a user with a `UserStats` row after migration
- **WHEN** `GET /api/v1/today` returns goal
- **THEN** `goal.preferredTimezone` equals `UTC`

#### Scenario: Update timezone

- **GIVEN** an authenticated user
- **WHEN** they PATCH `{ "preferredTimezone": "Asia/Ho_Chi_Minh" }`
- **THEN** subsequent goal progress uses that zone's calendar day and Today returns `goal.preferredTimezone = Asia/Ho_Chi_Minh`

#### Scenario: Reject invalid timezone

- **GIVEN** an authenticated user
- **WHEN** they PATCH `{ "preferredTimezone": "Not/A_Zone" }`
- **THEN** the API returns 400 and does not change the stored timezone

#### Scenario: Corrupt stored timezone falls back for math

- **GIVEN** `UserStats.preferredTimezone` is a non-resolvable string `"Bogus/Zone"`
- **WHEN** `GET /api/v1/today` loads goal
- **THEN** window math uses UTC fallback, response does not 500, and `goal.preferredTimezone` still exposes the stored `"Bogus/Zone"` string

#### Scenario: Cards-only PATCH leaves timezone unchanged

- **GIVEN** an authenticated user with `preferredTimezone = Asia/Tokyo` and `dailyGoalCards = 20`
- **WHEN** they PATCH `{ "dailyGoalCards": 40 }`
- **THEN** `dailyGoalCards` becomes 40 and `preferredTimezone` remains `Asia/Tokyo`

### Requirement: Zoned Day Goal Progress From Reviews

The system SHALL compute goal progress for the current calendar day in the user's `preferredTimezone` as the count of `ReviewHistory` rows with `reviewedAt` in `[startOfZonedDay(now, tz), nextZonedDay(now, tz))` (exclusive upper bound). Progress SHALL still **not** count `session_cards` answers in Phase 2. The system MUST preserve Phase 1 UTC behavior when `preferredTimezone` is `UTC`.

Returned shape SHALL include at least: `target`, `completed`, `remaining` (max(target − completed, 0)), and `pct` (clamped 0–100).

**Constraint**: MUST  
**Verification**: Unit tests with fixed clocks in `Asia/Ho_Chi_Minh` and `UTC`; integration against review submission incrementing `completed`

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

#### Scenario: Review exactly at next-day boundary excluded

- **GIVEN** target 20, one `ReviewHistory` row with `reviewedAt` exactly equal to `nextZonedDay` (the start of tomorrow in the user's preferred timezone)
- **WHEN** Today goal is loaded for the current zoned day
- **THEN** that row is **not** counted in `completed` for today (exclusive upper bound); it counts toward tomorrow's progress instead

#### Scenario: Zero-history new user

- **GIVEN** a user with no `ReviewHistory` rows at all and default `dailyGoalCards = 20`
- **WHEN** Today goal is loaded
- **THEN** `completed = 0`, `remaining = 20`, `pct = 0`, and no divide-by-zero or error occurs

#### Scenario: Local midnight boundary (VN)

- **GIVEN** `preferredTimezone = Asia/Ho_Chi_Minh` and a review at `2026-07-28T17:30:00.000Z` (00:30 next calendar day in VN, UTC+7)
- **WHEN** goal progress is loaded at `2026-07-28T16:00:00.000Z` (23:00 VN same calendar day)
- **THEN** that review is **not** counted in today's `completed` (it falls on the next zoned day)

#### Scenario: Local day includes UTC previous evening (VN)

- **GIVEN** `preferredTimezone = Asia/Ho_Chi_Minh` and a review at `2026-07-27T17:30:00.000Z` (00:30 VN on 2026-07-28)
- **WHEN** goal progress is loaded at `2026-07-28T10:00:00.000Z` (17:00 VN on 2026-07-28)
- **THEN** that review **is** counted in today's `completed`

#### Scenario: UTC users unchanged

- **GIVEN** `preferredTimezone = UTC`
- **WHEN** goal progress is computed
- **THEN** the window matches Phase 1 `[startOfUtcDay, nextUtcDay)` behavior

#### Scenario: DST spring-forward boundary

- **GIVEN** `preferredTimezone = America/New_York` and a fixed clock on a US DST spring-forward calendar day
- **WHEN** `startOfZonedDay` / `nextZonedDay` are computed
- **THEN** the helpers return a valid half-open day window without throwing (calendar-date-in-zone, not fixed UTC offset)

### Requirement: Goal Mutations Are Self-Scoped

`PATCH /api/v1/user/study-goals` SHALL derive the target user exclusively from the authenticated session (`requireUserId()`). The request body SHALL NOT contain a `userId` field, and any `userId` value present in the body SHALL be ignored — a user can never update another user's goal by supplying a different id.

**Constraint**: MUST  
**Verification**: API test asserting a body containing an unrelated `userId` still updates only the session user's `UserStats` row

#### Scenario: Body-supplied userId is ignored

- **GIVEN** an authenticated user A
- **WHEN** they PATCH `{ "dailyGoalCards": 30, "userId": "user-b" }`
- **THEN** only user A's `UserStats.dailyGoalCards` is updated to 30; user B's row is untouched
