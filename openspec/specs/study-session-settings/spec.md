# study-session-settings Specification

## Purpose
Pre-study configuration (mode, randomize, cards per round, requeue wrong) with batched rounds and remediation within a single study run.

## Requirements

### Requirement: Pre-Study Settings Screen
The system SHALL present a settings form at `/sets/[setId]/study` before starting any study mode.
**Constraint**: MUST
**Verification**: E2E `tests/e2e/study/study-settings.spec.ts`

#### Scenario: Configure Mode and Start
- **GIVEN** user owns a set with ≥ 5 cards
- **WHEN** they select mode=LEARN, randomize=true, cardsPerRound=5 and click Start
- **THEN** a StudySession is created with `settings` persisted and user is redirected to mode route with `?sessionId=<id>` as a URL query parameter; the mode page reads `sessionId` via `useSearchParams().get('sessionId')` and skips auto-POST

#### Scenario: Cards Per Round Validation
- **GIVEN** user enters cardsPerRound=0 or cardsPerRound=51
- **WHEN** they submit settings
- **THEN** client shows validation error; API rejects with 400 if bypassed

#### Scenario: Multiple Choice Only
- **GIVEN** user selects presentation "Multiple choice only"
- **WHEN** session starts with mode=LEARN
- **THEN** LearnMode shows MC questions only (no fill-in-the-blank). Note: V1 Learn is already MC-only; this flag documents intent and guards against future mixed Learn UI.

---

### Requirement: Batched Round Engine
The system SHALL split a study run into rounds of at most `cardsPerRound` cards, processing remediation queue first each round.
**Constraint**: MUST
**Verification**: Unit tests in `round-engine.test.ts` — `test_round_caps_at_cards_per_round()`, `test_round_includes_remediation_first()`

#### Scenario: Round Size Respected
- **GIVEN** settings `cardsPerRound=7` and deck of 20 cards
- **WHEN** round 1 starts
- **THEN** at most 7 cards are presented before round summary

#### Scenario: Wrong Card Requeued
- **GIVEN** `requeueWrong=true` and user answers card X incorrectly in round 1
- **WHEN** round 2 begins
- **THEN** card X appears in round 2 queue before new unseen cards

#### Scenario: Run Completes After Remediation
- **GIVEN** all deck cards seen and remediation queue empty
- **WHEN** last round completes
- **THEN** session complete screen shows overall score summary

#### Scenario: Requeue Disabled
- **GIVEN** `requeueWrong=false`
- **WHEN** user answers incorrectly
- **THEN** card is NOT added to remediation queue

#### Scenario: Per-Round Summary Shown
- **GIVEN** `cardsPerRound=5` and user completes 5 cards (round 1 of a 15-card deck)
- **WHEN** round 1 ends (all 5 cards answered)
- **THEN** a between-round summary screen shows round 1 score (correct/total for that round) and a "Next round" action; the overall run complete screen is NOT shown yet

---

### Requirement: Session Settings Persistence
The system SHALL store study settings on `StudySession.settings` JSON column when creating a session.
**Constraint**: MUST
**Verification**: Integration test `test_create_session_with_settings()`

#### Scenario: Settings Stored in DB
- **GIVEN** POST `/api/v1/study/sessions` with `{ setId, mode, settings: { randomize: false, cardsPerRound: 10, requeueWrong: true } }`
- **WHEN** session is fetched
- **THEN** `settings` JSON matches submitted values
