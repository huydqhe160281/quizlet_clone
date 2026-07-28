# today-learning-page Specification

## Purpose

Authenticated users get a dedicated `/today` planner that shows goal, recommendation CTA, learning queue, and retention insights with localized copy.

## Requirements

### Requirement: Aggregated Today API

The system SHALL expose `GET /api/v1/today` for authenticated users returning JSON including `goal` (shape `{ target, completed, remaining, pct }` as defined in `daily-study-goals`), `queue` (shape `{ items, totalEligible }` as defined in `daily-learning-queue`), `insights` (as defined in `retention-insights`), and `recommendation` (as defined in `recommended-study-session`). The response SHALL use `Cache-Control: private, no-store` (never a shared/public cache tag). Unauthenticated requests SHALL receive 401.

**Constraint**: MUST  
**Verification**: API route tests for authz and payload shape

#### Scenario: Authenticated aggregate

- **GIVEN** a logged-in user
- **WHEN** GET `/api/v1/today`
- **THEN** response 200 includes keys `goal`, `queue`, `insights`, `recommendation`

#### Scenario: Unauthenticated

- **GIVEN** no session
- **WHEN** GET `/api/v1/today`
- **THEN** response 401

### Requirement: Today Page UX

The system SHALL provide an authenticated `/today` page that:

- Renders goal progress, primary recommendation CTA, queue list (with reason badges), and insights
- Uses shared UI primitives where applicable (`PageHeader`, `EmptyStatePanel`, `QueryErrorPanel`)
- Supports nav reselect refetch for href `/today`
- Loads all user-visible strings from i18n catalogs (vi/en/ja)

**Constraint**: MUST  
**Verification**: Component tests for empty/error/loading; locale key presence check for Today keys in all three locales

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

### Requirement: Navigation Entry

The system SHALL add a **Today** item to desktop Sidebar and MobileNav for authenticated layouts, linking to `/today`.

**Constraint**: MUST  
**Verification**: Layout component assertions or smoke test

#### Scenario: Today visible in nav

- **GIVEN** an authenticated shell
- **WHEN** Sidebar/MobileNav render
- **THEN** a Today link to `/today` is present
