---
name: cjk-draw-mode
description: CJK draw study mode and flashcard new-word type field.
version: 1.0.0
---

# CJK Draw Mode Specifications

## ADDED Requirements

### Requirement: Flashcard New-Word Type Field

The system SHALL support an optional `type` field on `Flashcard` records with application-level value `null` or `"new-word"`.
**Constraint**: MUST
**Verification**: Unit test `card.schema.test.ts`; component test `CardEditor.type-toggle.test.tsx`

#### Scenario: Persist new-word type on create

- **GIVEN** an authenticated user creating a flashcard
- **WHEN** they POST `/api/v1/sets/[setId]/cards` with `{ front, back, type: "new-word" }`
- **THEN** the response includes `type: "new-word"` and the DB row stores `type = 'new-word'`

#### Scenario: Reject invalid type value

- **GIVEN** an authenticated user updating a flashcard
- **WHEN** they PATCH with `{ type: "invalid-value" }`
- **THEN** the API returns 400 `{ error: "VALIDATION_ERROR" }`

#### Scenario: Update card type via client mutation

- **GIVEN** a card row in CardEditor with `type: null`
- **WHEN** the user toggles the "Từ mới" checkbox
- **THEN** `updateCard` calls PATCH and `setKeys.cards(setId)` cache updates optimistically

---

### Requirement: Card Editor Type Controls

The system SHALL allow users to mark cards as new-word from CardEditor add form and inline row toggles, and display a badge on marked rows.
**Constraint**: MUST
**Verification**: Unit test `card.schema.test.ts`; component test `CardEditor.type-toggle.test.tsx`

#### Scenario: Add form checkbox

- **GIVEN** a user is adding a card in CardEditor
- **WHEN** they check "Từ mới (luyện viết CJK)" and submit
- **THEN** the created card has `type: "new-word"`

#### Scenario: Badge on new-word row

- **GIVEN** a card with `type === "new-word"` in SortableCardRow
- **WHEN** the card list renders
- **THEN** a Badge with text "Từ mới" is visible on that row

---

### Requirement: DRAW Study Mode Registration

The system SHALL register `DRAW` as a study mode in Zod schema, Prisma `StudyMode` enum, StudySettingsForm, StudyPageClient, and route `/sets/[setId]/draw`.
**Constraint**: MUST
**Verification**: Unit test `study.schema.test.ts`; unit test `study.service.test.ts` (DRAW filter scenarios)

#### Scenario: Prisma enum includes DRAW

- **GIVEN** `enum StudyMode` in `prisma/schema.prisma`
- **WHEN** migrations are applied
- **THEN** `StudyMode.DRAW` exists in `@prisma/client`

#### Scenario: Study settings disables DRAW when no new-word cards

- **GIVEN** a set with zero cards where `type === 'new-word'`
- **WHEN** the study settings page renders
- **THEN** DRAW option is disabled and helper text explains no new-word cards exist

#### Scenario: Navigate to draw route

- **GIVEN** a user starts a DRAW session from StudySettingsForm
- **WHEN** session creation succeeds
- **THEN** the app navigates to `/sets/[setId]/draw?sessionId=...`

---

### Requirement: DRAW Session Card Filtering

The system SHALL filter DRAW session card pools to only flashcards with `type === 'new-word'` and reject empty pools with HTTP 422.
**Constraint**: MUST
**Verification**: Unit test `study.service.test.ts` (DRAW filter scenarios)

#### Scenario: Filter to new-word cards only

- **GIVEN** a set with 10 cards, 3 marked `type: "new-word"`
- **WHEN** a DRAW session is created
- **THEN** the session pool contains exactly those 3 cards

#### Scenario: Empty pool error

- **GIVEN** a set with no cards where `type === 'new-word'`
- **WHEN** POST `/api/v1/study/sessions` with `{ mode: "DRAW" }`
- **THEN** the API returns 422 with code `DRAW_NO_CARDS` and message `"Bộ thẻ này không có từ nào được đánh dấu là 'từ mới'. Hãy đánh dấu ít nhất một thẻ trước khi dùng chế độ Vẽ."`

---

### Requirement: HanziWriter Canvas Drawing

The system SHALL provide a client-side canvas component using `hanzi-writer` to quiz stroke order for a single CJK character, with fallback textarea when drawing is unsupported.
**Constraint**: MUST
**Verification**: Component test `HanziWriterCanvas.test.tsx`

#### Scenario: Stroke quiz success

- **GIVEN** a card with `front: "大"` in hanzi-writer dataset
- **WHEN** the user completes all strokes with ≤ 3 mistakes
- **THEN** `onComplete(true)` is called

#### Scenario: Fallback compares against front

- **GIVEN** hanzi-writer fails to load for a character
- **WHEN** the user types the answer in the fallback textarea
- **THEN** `fuzzyMatch` compares input against `character` (front), not `back`

#### Scenario: Multi-character front

- **GIVEN** a card with `front` containing more than one character
- **WHEN** HanziWriterCanvas renders
- **THEN** fallback UI shows `"Chỉ hỗ trợ một ký tự CJK mỗi thẻ."` and textarea fallback is offered

---

### Requirement: DrawMode Session Flow

The system SHALL implement DrawMode mirroring WriteMode round engine: show definition prompt, record answers, show hint, and RoundSummary between rounds.
**Constraint**: MUST
**Verification**: Component test `DrawMode.test.tsx`

#### Scenario: Prompt shows back, draw target is front

- **GIVEN** a DRAW session card with `front: "大"` and `back: "big"`
- **WHEN** the card is active
- **THEN** the prompt displays "big" and HanziWriterCanvas receives `character: "大"`

#### Scenario: Round engine integration

- **GIVEN** the user completes a character quiz
- **WHEN** `onComplete(isCorrect)` fires
- **THEN** `recordRoundAnswer` is called before `recordAnswer`, hint displays for 1500ms, then `nextCard()` or `RoundSummary` follows WriteMode pattern

---

### Requirement: Draw Config Constants

The system SHALL centralize draw-mode magic numbers in `src/features/study/lib/draw-config.ts`.
**Constraint**: MUST
**Verification**: Unit test `draw-config.test.ts`

#### Scenario: Exported constants

- **GIVEN** `draw-config.ts` exists
- **WHEN** imported
- **THEN** `MAX_MISTAKES === 3`, `CANVAS_SIZE === 280`, `CANVAS_PADDING === 5`, `HINT_DISPLAY_MS === 1500`

---

## Non-Goals

- OCR freeform recognition
- Trace/tô theo nét mẫu
- Latin handwriting practice
- AI auto-tagging as new-word
- Hangul support in v1
