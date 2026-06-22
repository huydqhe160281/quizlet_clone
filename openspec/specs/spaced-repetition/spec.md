# spaced-repetition Specification

## Purpose

TBD - created by archiving change flashcard-app-system-design. Update Purpose after archive.

## Requirements

### Requirement: SM-2 Algorithm Implementation

The system SHALL implement the SM-2 spaced repetition algorithm as a pure function that calculates new interval, ease factor, and next due date from the current state and user grade.
**Constraint**: MUST
**Verification**: Unit test `study/sm2.test.ts` with known SM-2 fixtures

#### Scenario: First Review — GOOD grade

- **GIVEN** a new card (repetitions=0, easeFactor=2.5, interval=0)
- **WHEN** user grades it GOOD (grade=2)
- **THEN** `sm2.calculate()` returns `{ repetitions: 1, interval: 1, nextDueDate: tomorrow, easeFactor: 2.5 }`

#### Scenario: Second Review — GOOD grade

- **GIVEN** card with repetitions=1, easeFactor=2.5, interval=1
- **WHEN** user grades GOOD
- **THEN** returns `{ repetitions: 2, interval: 6, easeFactor: 2.5 }`

#### Scenario: Failed Review — AGAIN grade

- **GIVEN** card with repetitions=5, easeFactor=2.5, interval=30
- **WHEN** user grades AGAIN (grade=0)
- **THEN** returns `{ repetitions: 0, interval: 1, easeFactor: max(1.3, 2.5 - 0.2) = 2.3 }`

#### Scenario: EASY grade — Ease Factor Boost

- **GIVEN** card with easeFactor=2.5
- **WHEN** user grades EASY (grade=3)
- **THEN** new easeFactor = 2.5 + 0.1 = 2.6 (boosted for easy cards)

#### Scenario: HARD grade — Reduced Interval

- **GIVEN** card with repetitions=2, easeFactor=2.5, interval=6
- **WHEN** user grades HARD (grade=1)
- **THEN** returns `{ repetitions: 2, interval: ceil(6 * 1.2) = 8, easeFactor: max(1.3, 2.5 - 0.15) = 2.35 }`
  - interval is multiplied by 1.2 (soft boost, not full SM-2 advance)
  - ease factor decreases by 0.15 (smaller penalty than AGAIN)
  - `repetitions` count is NOT reset (unlike AGAIN)

#### Scenario: Ease Factor Floor

- **GIVEN** card with easeFactor=1.35 (near floor)
- **WHEN** user grades HARD (grade=1)
- **THEN** new easeFactor = max(1.3, 1.35 - 0.15) = 1.3 (clamped, never below 1.3)

---

### Requirement: Due Cards Query

The system SHALL return all cards due for review (dueDate <= NOW()) for the current user, ordered by dueDate ascending.
**Constraint**: MUST
**Verification**: Integration test `study/due-cards.test.ts`

#### Scenario: Cards Due Today

- **GIVEN** user has 5 cards with `dueDate <= NOW()` and 10 cards with `dueDate > NOW()`
- **WHEN** GET `/api/v1/study/due-cards`
- **THEN** response contains exactly 5 cards, ordered by `dueDate ASC`

#### Scenario: No Due Cards

- **GIVEN** user has no cards with `dueDate <= NOW()`
- **WHEN** GET `/api/v1/study/due-cards`
- **THEN** response is `{ data: [], count: 0 }`

---

### Requirement: Review Submission

The system SHALL persist the review result, update CardProgress with new SM-2 state, and record a ReviewHistory entry.
**Constraint**: MUST
**Verification**: Integration test `study/review-submission.test.ts`

#### Scenario: Valid Review

- **GIVEN** authenticated user with existing CardProgress for cardId X
- **WHEN** POST `/api/v1/study/review` `{ cardId: X, grade: "GOOD", responseMs: 1200 }`
- **THEN**
  - CardProgress(userId, cardId=X) is updated with new `interval`, `easeFactor`, `dueDate`, `reviewCount += 1`
  - ReviewHistory record created with `grade=GOOD`, `reviewedAt=NOW()`, `responseMs=1200`
  - Response includes `{ newInterval, newEaseFactor, nextDueDate }`

#### Scenario: New Card First Review

- **GIVEN** user reviews a card they've never reviewed before (no CardProgress row)
- **WHEN** POST `/api/v1/study/review` `{ cardId, grade: "GOOD" }`
- **THEN** CardProgress record is created (upsert) with initial SM-2 values

---

### Requirement: Review Rate Limiting

The system SHALL rate limit review submissions to prevent abuse (max 200 reviews/minute per user).
**Constraint**: SHOULD

#### Scenario: Rate Limit Exceeded

- **GIVEN** user sends 201 review requests within 60 seconds
- **WHEN** 201st request arrives
- **THEN** API returns 429 `{ error: "RATE_LIMITED", retryAfter: 60 }`

---
