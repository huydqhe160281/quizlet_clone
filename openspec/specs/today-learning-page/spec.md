# today-learning-page Specification

## Purpose

Authenticated users get a dedicated `/today` planner that shows goal, recommendation CTA, learning queue, and retention insights with localized copy.

## Engine Layer Map

| Layer     | Area       | Component/Symbol               |
| --------- | ---------- | ------------------------------ |
| Interface | Feature UI | `TodayPageClient` goal + CTA   |
| Interface | i18n       | `todayPage.*` timezone / focus |

## Requirements

### Requirement: Aggregated Today API

The system SHALL expose `GET /api/v1/today` for authenticated users returning JSON including `goal` (shape `{ target, completed, remaining, pct, preferredTimezone }` as defined in `daily-study-goals`), `queue` (shape `{ items, totalEligible }` as defined in `daily-learning-queue`), `insights` (as defined in `retention-insights`), and `recommendation` (as defined in `recommended-study-session`). The response SHALL use `Cache-Control: private, no-store` (never a shared/public cache tag). Unauthenticated requests SHALL receive 401.

`GET /api/v1/today` SHALL include `goal.preferredTimezone` (IANA string) alongside `{ target, completed, remaining, pct }`.

**Constraint**: MUST  
**Verification**: API route tests for authz and payload shape; API contract test

#### Scenario: Authenticated aggregate

- **GIVEN** a logged-in user
- **WHEN** GET `/api/v1/today`
- **THEN** response 200 includes keys `goal`, `queue`, `insights`, `recommendation`

#### Scenario: Unauthenticated

- **GIVEN** no session
- **WHEN** GET `/api/v1/today`
- **THEN** response 401

#### Scenario: Today goal includes preferredTimezone

- **GIVEN** a logged-in user with `preferredTimezone = Asia/Ho_Chi_Minh`
- **WHEN** GET `/api/v1/today`
- **THEN** `goal.preferredTimezone` equals `Asia/Ho_Chi_Minh`

### Requirement: Today Page UX

The system SHALL provide an authenticated `/today` page that:

- Renders goal progress, primary recommendation CTA, queue list (with reason badges), and insights
- Uses shared UI primitives where applicable (`PageHeader`, `EmptyStatePanel`, `QueryErrorPanel`)
- Supports nav reselect refetch for href `/today`
- Loads all user-visible strings from i18n catalogs (vi/en/ja)
- Allows editing `preferredTimezone` (curated allowlist ⊆ validated IANA set) alongside the daily card goal
- Passes `recommendation.cardIds` into `createStudySessionOnce` / session create for the primary `set-session` CTA
- Indicates the focused card count whenever `cardIds` is present
- Notes in copy that streak may remain UTC while goals/insights use preferred timezone

**Constraint**: MUST  
**Verification**: Component tests for empty/error/loading; locale key presence check for Today keys in all three locales; component tests; locale parity

#### Scenario: Empty queue state

- **GIVEN** Today API returns an empty queue and `recommendation.kind = "empty"`
- **WHEN** the user views `/today`
- **THEN** an empty-state panel explains there is nothing due and offers navigation toward creating/opening sets

#### Scenario: Error with retry

- **GIVEN** Today API fails
- **WHEN** the page renders the error
- **THEN** a retry control is available (QueryErrorPanel pattern)

#### Scenario: Nav reselect refetch

- **GIVEN** the user is already on `/today`
- **WHEN** they re-click the Today nav item
- **THEN** the Today query refetches

#### Scenario: Locale catalog parity

- **GIVEN** the Today feature's message keys (e.g. `todayPage.*`)
- **WHEN** the `vi`, `en`, and `ja` message catalogs are compared
- **THEN** every key present in one locale is present in all three (no missing-key fallback in the rendered UI)

#### Scenario: Timezone control visible

- **GIVEN** Today loads successfully with `goal.preferredTimezone`
- **WHEN** the user opens goal editing
- **THEN** a timezone control is available and saving PATCHes `preferredTimezone`

#### Scenario: CTA passes cardIds

- **GIVEN** recommendation `kind = set-session` with `cardIds = [c1]`
- **WHEN** the user clicks the set-session CTA
- **THEN** `createStudySessionOnce` / session create is invoked with those `cardIds`

#### Scenario: Locale catalog parity (new keys)

- **GIVEN** new Phase 2 Today keys (timezone + focused count)
- **WHEN** `vi`, `en`, and `ja` catalogs are compared
- **THEN** every new key is present in all three locales

### Requirement: Navigation Entry

The system SHALL add a **Today** item to desktop Sidebar and MobileNav for authenticated layouts, linking to `/today`.

**Constraint**: MUST  
**Verification**: Layout component assertions or smoke test

#### Scenario: Today visible in nav

- **GIVEN** an authenticated shell
- **WHEN** Sidebar/MobileNav render
- **THEN** a Today link to `/today` is present
