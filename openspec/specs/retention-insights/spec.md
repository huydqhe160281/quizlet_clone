# retention-insights Specification

## Purpose

Today shows lightweight retention signals derived from existing review and streak data so learners understand why the queue looks the way it does.

## Requirements

### Requirement: Seven-Day Retention Snapshot

The system SHALL include an `insights` object on `GET /api/v1/today` with at least:

- `reviewsLast7Days`: count of `ReviewHistory` in the trailing 7 UTC days
- `accuracyLast7Days`: fraction of those reviews with grade in `{GOOD, EASY}` (0 when no reviews)
- `currentStreak`: effective streak via existing streak helpers
- `weakSets`: up to 3 sets with the highest counts of **uncapped** due/weak queue membership (id + title + count) — counts SHALL be derived from all eligible due/weak cards before the `limit` slice (not from capped `queue.items`); `new` cards are excluded. Ordered by `count DESC` then `setId ASC` for a deterministic tie-break

**Constraint**: MUST  
**Verification**: Unit tests with seeded review history and progress rows

#### Scenario: Accuracy with mixed grades

- **GIVEN** in the last 7 UTC days the user has 8 GOOD/EASY and 2 AGAIN reviews
- **WHEN** Today insights are computed
- **THEN** `reviewsLast7Days = 10` and `accuracyLast7Days = 0.8`

#### Scenario: Zero reviews window

- **GIVEN** no reviews in the last 7 UTC days
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
