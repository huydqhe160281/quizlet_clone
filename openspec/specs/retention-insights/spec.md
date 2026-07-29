# retention-insights Specification

## Purpose

Today shows lightweight retention signals derived from existing review and streak data so learners understand why the queue looks the way it does. Seven-day retention windows align to the learner's preferred timezone calendar days.

## Engine Layer Map

| Layer   | Area        | Component/Symbol                           |
| ------- | ----------- | ------------------------------------------ |
| Service | `learning/` | `getRetentionInsights` + zoned day helpers |

## Requirements

### Requirement: Seven-Day Retention Snapshot

The system SHALL include an `insights` object on `GET /api/v1/today` with at least:

- `reviewsLast7Days`: count of `ReviewHistory` in the trailing seven zoned calendar days through the exclusive end of the current zoned day
- `accuracyLast7Days`: fraction of those reviews with grade in `{GOOD, EASY}` (0 when no reviews)
- `currentStreak`: effective streak via existing streak helpers
- `weakSets`: up to 3 sets with the highest counts of **uncapped** due/weak queue membership (id + title + count) — counts SHALL be derived from all eligible due/weak cards before the `limit` slice (not from capped `queue.items`); `new` cards are excluded. Ordered by `count DESC` then `setId ASC` for a deterministic tie-break

The trailing review window for `reviewsLast7Days` / `accuracyLast7Days` SHALL be the half-open interval `[startOfZonedDay(now, preferredTimezone) - 6 calendar days, nextZonedDay(now, preferredTimezone))` (seven zoned calendar days through the exclusive end of the current zoned day). This replaces the Phase 1 rolling-MS lookback for those two counters. `weakSets` membership rules from Phase 1 (uncapped due/weak) are unchanged. `currentStreak` MAY continue using existing streak helpers (UTC) in Phase 2; UI copy SHOULD note the split.

**Constraint**: MUST  
**Verification**: Unit tests with seeded review history and progress rows; unit tests seeding reviews with fixed timestamps around a non-UTC midnight

#### Scenario: Accuracy with mixed grades

- **GIVEN** in the last 7 zoned calendar days the user has 8 GOOD/EASY and 2 AGAIN reviews
- **WHEN** Today insights are computed
- **THEN** `reviewsLast7Days = 10` and `accuracyLast7Days = 0.8`

#### Scenario: Zero reviews window

- **GIVEN** no reviews in the last 7 zoned calendar days
- **WHEN** insights are computed
- **THEN** `reviewsLast7Days = 0`, `accuracyLast7Days = 0`, and the API does not error

#### Scenario: Weak sets ranking

- **GIVEN** set A has 5 due/weak queue cards and set B has 2
- **WHEN** insights are computed
- **THEN** `weakSets[0]` refers to set A with count 5

#### Scenario: Weak sets tie-break

- **GIVEN** sets C, D, E, and F each have exactly 4 due/weak queue cards (a 4-way tie) and set C has the lexicographically smallest `setId`
- **WHEN** insights are computed
- **THEN** `weakSets` contains exactly 3 entries, ordered by `setId ASC` among tied counts, with set C first

#### Scenario: Insights window uses preferred timezone

- **GIVEN** `preferredTimezone = Asia/Tokyo`, now = `2026-07-28T00:30:00+09:00`, and exactly one review at `2026-07-28T00:10:00+09:00`
- **WHEN** insights are computed
- **THEN** `reviewsLast7Days` includes that review (≥ 1)

#### Scenario: Review before zoned window excluded

- **GIVEN** `preferredTimezone = Asia/Tokyo`, now = `2026-07-28T12:00:00+09:00`, and a review at `2026-07-21T12:00:00+09:00` (exactly 7 calendar days before the current Tokyo day start)
- **WHEN** insights are computed
- **THEN** that review is **not** counted in `reviewsLast7Days` (outside `[start-6d, next)`)
