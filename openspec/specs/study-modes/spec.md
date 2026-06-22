# study-modes Specification

## Purpose

TBD - created by archiving change flashcard-app-system-design. Update Purpose after archive.

## Requirements

### Requirement: Flashcard Mode

The system SHALL display cards one at a time with a 3D flip animation, supporting keyboard navigation and mobile swipe.
**Constraint**: MUST
**Verification**: E2E test `study/flashcard-mode.spec.ts`

#### Scenario: Card Flip

- **GIVEN** user is in Flashcard Mode viewing card front
- **WHEN** they press Space or click the card
- **THEN** a CSS 3D flip animation plays (< 400ms) revealing the card back

#### Scenario: Keyboard Navigation

- **GIVEN** user is in Flashcard Mode
- **WHEN** they press ArrowRight
- **THEN** the next card is shown; WHEN they press ArrowLeft, the previous card is shown

#### Scenario: Mobile Swipe

- **GIVEN** user on a mobile device in Flashcard Mode
- **WHEN** they swipe right
- **THEN** the next card is shown; swipe left shows previous card

#### Scenario: End of Deck

- **GIVEN** user is on the last card
- **WHEN** they press ArrowRight
- **THEN** the session complete screen is shown with summary (X/Y cards reviewed)

---

### Requirement: Learn Mode

The system SHALL present each card as a question (front) and accept user's answer, scoring it as correct/incorrect.
**Constraint**: MUST

#### Scenario: Correct Answer (Multiple Choice)

- **GIVEN** a card with front="apple" and back="quả táo"
- **WHEN** user selects "quả táo" from multiple choice options
- **THEN** correct feedback is shown and SessionCard.isCorrect = true

#### Scenario: Correct Answer (Fill-in-the-Blank)

- **GIVEN** a card with front="apple" and back="quả táo"
- **WHEN** user types "quả táo" in the fill-in-the-blank input
- **THEN** answer is evaluated (fuzzy match ≥ 0.85) and SessionCard.isCorrect = true on match

#### Scenario: Learn Mode Score Display

- **GIVEN** user completes a Learn Mode session with 8/10 correct
- **WHEN** the session ends
- **THEN** completion screen shows score summary "8/10 correct (80%)"

#### Scenario: Wrong Answer

- **GIVEN** same card
- **WHEN** user selects an incorrect option
- **THEN** wrong feedback is shown with correct answer revealed; SessionCard.isCorrect = false

---

### Requirement: Write Mode

The system SHALL accept typed text answers and evaluate correctness via fuzzy matching (Jaro-Winkler >= 0.85).
**Constraint**: MUST
**Verification**: Unit test `utils/fuzzy.test.ts`

#### Scenario: Exact Match

- **GIVEN** correct answer is "đất nước"
- **WHEN** user types "đất nước" exactly
- **THEN** marked as CORRECT

#### Scenario: Fuzzy Match (typo tolerance)

- **GIVEN** correct answer is "democracy"
- **WHEN** user types "democarcy" (transposition)
- **THEN** Jaro-Winkler("democarcy", "democracy") ≈ 0.96 >= 0.85 → marked as CORRECT

#### Scenario: Wrong Answer

- **GIVEN** correct answer is "democracy"
- **WHEN** user types "dictator"
- **THEN** similarity < 0.85 → marked as INCORRECT, correct answer revealed

---

### Requirement: Test Mode

The system SHALL generate a test from set cards with 3 question types: Multiple Choice, True/False, Typing.
**Constraint**: MUST

#### Scenario: Multiple Choice Generation

- **GIVEN** a set with >= 4 cards
- **WHEN** Test Mode starts
- **THEN** each MC question has 1 correct option + 3 random distractors from other cards in the set

#### Scenario: Insufficient Cards for MC

- **GIVEN** a set with < 4 cards
- **WHEN** Test Mode starts
- **THEN** MC questions use available cards as distractors; Typing questions fill the remainder

#### Scenario: True/False Question Generation

- **GIVEN** a set with at least 2 cards
- **WHEN** Test Mode generates a True/False question
- **THEN** the question shows a front + back pairing; 50% probability of pairing being correct; user answers True or False; evaluated against actual pairing

#### Scenario: Typing Question

- **GIVEN** a card in Test Mode assigned as a Typing question
- **WHEN** user types their answer and submits
- **THEN** answer is evaluated with fuzzy matching (Jaro-Winkler ≥ 0.85, same as Write Mode); correct/incorrect result shown with actual answer revealed

---

### Requirement: Study Session Tracking

The system SHALL create a StudySession record at session start and update it on completion with accuracy score.
**Constraint**: MUST
**Verification**: Integration test `study/session-tracking.test.ts`

#### Scenario: Session Created

- **GIVEN** user clicks "Study" on a set
- **WHEN** POST `/api/v1/study/sessions` is called with `{ setId, mode }`
- **THEN** StudySession record created with `startedAt = NOW()`, `totalCards = set.cardCount`

#### Scenario: Session Completed

- **GIVEN** user finishes reviewing all cards
- **WHEN** PATCH `/api/v1/study/sessions/:id` is called with `{ completedAt, correctCount }`
- **THEN** `score = correctCount / totalCards` is calculated and stored

---

### Requirement: Pre-Study Settings Screen

The system SHALL present a settings form before starting any study mode.
**Constraint**: MUST

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

#### Scenario: Settings Stored in DB

- **GIVEN** POST `/api/v1/study/sessions` with `{ setId, mode, settings: { randomize: false, cardsPerRound: 10, requeueWrong: true } }`
- **WHEN** session is fetched
- **THEN** `settings` JSON matches submitted values
