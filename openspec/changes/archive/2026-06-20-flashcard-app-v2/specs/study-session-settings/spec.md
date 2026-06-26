# Specification: Study Session Settings & Batched Rounds

## Capability Summary
Trước khi học, người dùng cấu hình mode, random, số thẻ mỗi round; thẻ trả lời sai được nhắc lại ở round tiếp theo trong cùng study run.

## Layer Map

| Layer | Component | Symbol / Path |
|---|---|---|
| UI | Settings page | `src/app/(app)/sets/[setId]/study/page.tsx` |
| UI | Form | `src/features/study/components/StudySettingsForm.tsx` |
| UI | State | `src/stores/study.store.ts`, `src/features/study/lib/round-engine.ts` |
| API | Sessions | `src/app/api/v1/study/sessions/route.ts` (extended body; pass `input.settings` to `createSession()`) |
| Schema | Zod | `src/features/study/schemas/study.schema.ts` — extend `createSessionSchema` with `settings?: StudySessionSettings`; add `studySessionSettingsSchema` |
| Service | Study | `src/server/services/study/study.service.ts` |
| DB | Column | `StudySession.settings` (JSONB) |

---

## ADDED Requirements

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

---

## Out of Scope

- SM-2 schedule changes from in-run remediation
- Server-side round pagination API
- New `StudyMode` enum value for MC-only

## Implementation Notes

- **MC-only presentation flag**: `settings.presentation = 'multiple_choice'` passed to `LearnMode` component. V1 Learn mode is already MC-only; the flag documents intent and acts as a guard against future mixed-mode Learn UI. Unit test MUST verify that `LearnMode` with `presentation='multiple_choice'` renders MC questions and NOT fill-in-the-blank. Path: `src/features/study/components/LearnMode.test.tsx` (new).
- **Per-round summary component**: Reuse `SessionComplete` component pattern or render inline summary between rounds. The between-round summary must display at minimum: round number, cards correct this round, cards incorrect this round.
