# Specification: Study Modes

## Capability Summary
Người dùng có thể học một bộ Flashcard qua 4 chế độ: Flashcard (flip card), Learn (Q&A), Write (gõ đáp án + fuzzy match), và Test (MC/T-F/Typing) — mỗi session được track trong DB.

## Layer Map

| Layer | Component | Symbol / Path |
|---|---|---|
| UI | Study pages | `src/app/(app)/sets/[setId]/flashcard/`, `/learn/`, `/write/`, `/test/` |
| UI | Components | `src/features/study/components/flashcard/`, `/learn/`, `/write/`, `/test/` |
| UI | State | `src/stores/study.store.ts` — Zustand (currentIndex, mode, sessionId) |
| API | Sessions | `src/app/api/v1/study/sessions/route.ts`, `/[sessionId]/route.ts` |
| Service | Study | `src/server/services/study.service.ts` |
| Lib | Fuzzy | `src/lib/utils/fuzzy.ts` — Jaro-Winkler similarity |
| DB | Tables | `StudySession`, `SessionCard` |

---

## ADDED Requirements

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

## Out of Scope
- Match mode (memory game / pairs matching)
- Timed test (countdown timer per question)
- Multiplayer / competitive mode
- Audio TTS auto-play during study
