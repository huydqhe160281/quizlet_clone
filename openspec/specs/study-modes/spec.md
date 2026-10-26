# study-modes Specification

## Purpose

TBD - created by archiving change flashcard-app-system-design. Update Purpose after archive.

## Engine Layer Map

| Layer     | Area     | Component/Symbol         |
| --------- | -------- | ------------------------ |
| Service   | `study/` | `createSession`          |
| Interface | API      | `createSessionSchema`    |
| Interface | Client   | `createStudySessionOnce` |

## Requirements

### Requirement: Optional Session Card Subset

`POST /api/v1/study/sessions` SHALL accept optional top-level `cardIds: string[]` (not inside `StudySessionSettings`). When omitted, behavior is unchanged (full mode pool). When provided, the array MUST be non-empty and every id MUST belong to the target set's mode pool; otherwise respond **400**. Incomplete-session resume SHALL scan incompletes for `userId+setId+mode` (not latest-only), then resume the newest row where settings match **and** `sessionCards` membership equals the requested subset (order-independent) when `cardIds` is provided; when omitted, resume the newest incomplete whose membership equals the full mode pool. `createStudySessionOnce` SHALL include sorted `cardIds` in its dedupe cache key and POST body.

**Constraint**: MUST  
**Verification**: `study.service.test.ts` + `create-session-once` tests

#### Scenario: Omitted cardIds keeps full pool

- **GIVEN** set A has 10 cards
- **WHEN** createSession LEARN without cardIds
- **THEN** session has 10 session cards

#### Scenario: Subset materializes only those cards

- **GIVEN** set A has cards c1..c10
- **WHEN** createSession LEARN with `cardIds = [c1, c2]`
- **THEN** session has exactly 2 session cards for c1 and c2

#### Scenario: Empty cardIds rejected

- **GIVEN** an authenticated createSession request
- **WHEN** body includes `cardIds: []`
- **THEN** the API returns 400 and creates no session

#### Scenario: Resume matches same subset

- **GIVEN** an incomplete LEARN session for set A with cards `{c1, c2}` and a newer incomplete with `{c3}`
- **WHEN** createSession is called with `cardIds = [c1, c2]` and matching settings
- **THEN** the `{c1, c2}` session is resumed (not the newer `{c3}` session, and not duplicated)

#### Scenario: Different subset does not resume

- **GIVEN** an incomplete LEARN session for set A with cards `{c1, c2}`
- **WHEN** createSession is called with `cardIds = [c3]`
- **THEN** a new session is created (no false resume)

#### Scenario: Reject foreign cardIds

- **GIVEN** `cardIds` containing an id not in set A
- **WHEN** createSession(set A, LEARN, cardIds) runs
- **THEN** the API/service returns 400 and creates no session

#### Scenario: Client cache distinguishes subsets

- **GIVEN** two rapid `createStudySessionOnce` calls for the same set/mode with different `cardIds`
- **WHEN** both execute within the dedupe TTL
- **THEN** they do not share a cache entry (distinct POSTs / results)

### Requirement: Flashcard Mode

The system SHALL display cards one at a time with a 3D flip animation and let the learner grade each card as "Know it" or "Still learning" by keyboard, button, or swipe.
**Constraint**: MUST
**Verification**: E2E test `study/flashcard-mode.spec.ts`; unit tests `FlashcardMode.complete.test.tsx`, `FlashcardMode.swipe.test.tsx`

#### Scenario: Card Flip

- **GIVEN** user is in Flashcard Mode viewing card front
- **WHEN** they press Space or click the card
- **THEN** a CSS 3D flip animation plays (< 400ms) revealing the card back
- **AND** Space flips even when a grading button still has focus (it never re-clicks that button)

#### Scenario: Know it

- **GIVEN** user is in Flashcard Mode
- **WHEN** they press ArrowRight, tap "Know it", or swipe the card right
- **THEN** the card is recorded as correct, the correct-answer chime plays (when enabled), and the next card is shown

#### Scenario: Still learning

- **GIVEN** user is in Flashcard Mode
- **WHEN** they press ArrowLeft, tap "Still learning", or swipe the card left
- **THEN** the card is recorded as incorrect without a chime, the next card is shown, and the card returns in a later round (also for legacy sessions without stored settings) unless the learner turned requeue off

#### Scenario: One grade per card

- **GIVEN** a card is being swiped off-screen
- **WHEN** a key or button grades the same card before the swipe finishes
- **THEN** the card is recorded once and the following card is not skipped; there is no "previous card" control, so a card cannot be graded twice in a round

#### Scenario: Keys typed into fields are ignored

- **GIVEN** focus is in a text field (e.g. the guide chat)
- **WHEN** the learner presses Space or an arrow key
- **THEN** Flashcard Mode does not flip or grade, and the key keeps its default behavior in the field

#### Scenario: Autoplay does not grade

- **GIVEN** autoplay is on
- **WHEN** it moves past a card
- **THEN** the card is passed without a chime, without being sent as an answer, and without counting toward "Know it"

#### Scenario: End of Deck

- **GIVEN** user is on the last card
- **WHEN** they grade it and no "Still learning" cards remain
- **THEN** the session complete screen is shown with summary (X/Y cards reviewed, X never above Y)

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
- **THEN** `score = correctCount / totalCards` (accuracy at completion) is calculated and stored. This is distinct from Dashboard **progress** (`answeredCount / totalCards`).

---

### Requirement: Study Session Create Idempotency

The system MUST create or resume a study session such that duplicate create attempts for the same learner intent do not produce conflicting or duplicate active sessions.

#### Scenario: Double submit does not duplicate session

- **GIVEN** a learner starts a study mode for a set and a create-session request is already in flight or succeeded
- **WHEN** a second create-session request is issued for the same set, mode, and learner intent (e.g. double click, remount, retry)
- **THEN** the client continues with a single canonical session (existing or newly created once) and does not leave the learner in a broken double-session state

#### Scenario: Resume prefers existing in-progress session

- **GIVEN** the learner has an in-progress session for the set and mode
- **WHEN** they choose to continue/resume from the launcher or dashboard recent session
- **THEN** the system resumes that session rather than silently creating a conflicting new session

---

### Requirement: Immediate Study Feedback And Progress

The system MUST provide immediate correctness, progress, and completion feedback during study modes without requiring hover-only interactions. Feedback in scope is **mode-native** (client/session evaluation for Learn/Write/Test/Flashcard/Draw as applicable) — not AI-generate or AI-evaluator paths (those remain do-not-touch unless a user-approved P0).

#### Scenario: Answer feedback is immediate

- **GIVEN** a learner submits an answer in a study mode that evaluates correctness with mode-native logic
- **WHEN** the answer is accepted by the client/session logic
- **THEN** the UI shows clear correct/incorrect (or equivalent) feedback and updates progress before requiring another navigation step

#### Scenario: Session complete is explicit

- **GIVEN** the learner finishes the last card/question in the session round
- **WHEN** completion is reached
- **THEN** a session complete (or round summary) surface is shown with actionable next steps (e.g. restart, back to set)

#### Scenario: Mobile study does not depend on hover

- **GIVEN** a learner uses a touch viewport
- **WHEN** they study in a mode whose chrome was edited for feedback/UX
- **THEN** primary actions and feedback remain usable without hover

#### Scenario: Actionable error on touched study flow

- **GIVEN** a study create/resume or answer submit fails on a touched flow (network/API/validation)
- **WHEN** the error is shown
- **THEN** the message states what went wrong and a next action (retry/resume/back), and in-progress typed input is preserved unless a documented P0 forces a remount

#### Scenario: Auth is out of rewrite scope for optimization playbooks

- **GIVEN** an unauthenticated or stale-session learner hits dashboard or study entry
- **WHEN** existing auth-entry-redirect behavior applies
- **THEN** optimization playbook changes MUST NOT rewrite auth flows; Observe may only flag auth issues as P0 for a separate change unless the user explicitly expands scope

---

### Requirement: Answer Feedback Auto-Advance

Learn, Write, Test and spaced-repetition review SHALL share one answer feedback flow (`useAnswerAutoAdvance`, `playAnswerFeedback`). Draw keeps its stroke-hint delay but uses the same chime and Continue control.
**Constraint**: MUST
**Verification**: unit tests `useAnswerAutoAdvance.test.ts`, `TestMode.test.tsx`, `TestMode.typing.test.tsx`

#### Scenario: Correct answer

- **GIVEN** a learner answers correctly
- **WHEN** feedback is shown
- **THEN** the correct-answer chime plays (when enabled) and the next question appears after 1s

#### Scenario: Incorrect answer

- **GIVEN** a learner answers incorrectly
- **WHEN** feedback is shown
- **THEN** no sound plays and the next question appears after 5s, or immediately via Continue / Enter

#### Scenario: Enter belongs to the focused field

- **GIVEN** feedback is shown or a typed answer is being composed with an IME
- **WHEN** the learner presses Enter inside another text field, or to confirm an IME conversion
- **THEN** the study mode neither advances nor submits

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
