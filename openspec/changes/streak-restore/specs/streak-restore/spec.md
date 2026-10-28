---
name: streak-restore
description: Limited streak restores for 1–3 missed days, monthly top-up and review rewards.
version: 1.0.0
---

# Streak Restore Specifications

## ADDED Requirements

### Requirement: Restore Balance

`UserStats.streakRestores` SHALL start at 5 (also for rows existing before this change) and never
exceed 5. The balance is synced lazily whenever restore status is read or a restore is requested:

1. Monthly top-up: when the current month in `preferredTimezone` differs from
   `streakRestoresMonth`, the balance becomes `max(balance, 3)` and the month is stored. A null
   month is initialised to the current month without a top-up.
2. Review reward: review activity = `review_history` rows + answered `session_cards` (the heatmap
   metric). Every 400 activity units past `streakRestoreCredited` grants 1 restore up to the cap;
   units that would exceed the cap are forfeited. A null credited count is initialised to the
   current activity (past reviews are not paid out retroactively).
   **Constraint**: MUST
   **Verification**: `streak-restore.service.test.ts`

#### Scenario: Monthly top-up keeps a larger balance

- **GIVEN** a balance of 1 last synced in October
- **WHEN** status is read in November
- **THEN** the balance is 3; a balance of 4 would stay 4

#### Scenario: Review reward capped at five

- **GIVEN** a balance of 4 and 900 new review activity units
- **WHEN** the balance is synced
- **THEN** the balance is 5 and all 800 credited units are consumed

### Requirement: Break Capture

When a streak breaks (a study day after a gap of 2+ days, or a streak read that zeroes an expired
streak) the system SHALL store the lost streak and its last study date in `brokenStreak` /
`brokenStreakLastDate`.
**Constraint**: MUST
**Verification**: `stats.service.test.ts`

### Requirement: Restore Offer and Restore

A restore offer exists when 1–3 calendar days were missed (in `preferredTimezone`) since the lost
streak's last study date, and either the user has not studied since, or has studied only today.
The cost is the number of missed days. `POST /api/v1/user/streak/restore` (same-origin, rate
limited) SHALL apply it only when the balance covers the cost, using an optimistic check so a
concurrent update cannot double-spend.

- Not studied since: `currentStreak` = lost streak, `lastStudiedDate` = yesterday.
- Studied today: `currentStreak` = lost streak + 1, `lastStudiedDate` = today.
  **Constraint**: MUST
  **Verification**: `streak-restore.service.test.ts`, `streak/restore/route.test.ts`

#### Scenario: Return after two missed days

- **GIVEN** a 12-day streak last studied on Oct 25 and 3 restores
- **WHEN** the user opens the app on Oct 28 and confirms
- **THEN** 2 restores are spent, the streak shows 12, and studying today makes it 13

#### Scenario: Gap too long

- **GIVEN** the last study day was 5 days ago
- **THEN** no offer is returned and POST answers 409

#### Scenario: Not enough restores

- **GIVEN** 3 missed days and a balance of 2
- **THEN** the offer is marked unaffordable and POST answers 409
