# Specs: CJK Draw Mode
> Revision 3 — post saturation check (Iteration 2 fixes)

## Non-Goals

- OCR freeform recognition (identify unknown characters)
- Trace/tô theo nét mẫu (overlay tracing)
- Latin/Roman handwriting practice
- AI auto-tagging cards as `new-word`
- Hangul (Korean) support in v1 — unsupported; show fallback
- Kana (Japanese) — experimental only, depends on hanzi-writer dataset availability

## Edge Cases

| Edge Case | Required Behavior |
|-----------|------------------|
| `flashcard.front` contains multiple characters or spaces | Show fallback UI: "Chỉ hỗ trợ một ký tự CJK mỗi thẻ." + textarea fallback |
| hanzi-writer CDN unavailable / timeout | Fall back to textarea input with message "Không tải được dữ liệu ký tự" |
| Character not in hanzi-writer dataset (Hangul, rare chars) | Same fallback UI as CDN failure |
| User starts DRAW session with 0 new-word cards | API returns 422; StudySettingsForm disables DRAW option |
| User toggles `type` while an active DRAW session exists | Session continues with original pool; type change affects next session only |

---

## REQ-001: Flashcard Type Field (DB + Schema)

### REQ-001.1 — Prisma Model
```
GIVEN the Flashcard model in prisma/schema.prisma
WHEN a developer adds the type field
THEN the model has: type String? (nullable, no @default needed)
AND existing rows default to null at DB level via migration
```
- Field name: `type`, type: `String?`, no `@default` clause (null is implicit)

### REQ-001.2 — Migration
```
GIVEN prisma/schema.prisma has type String? on Flashcard
WHEN `pnpm prisma migrate dev --name add-flashcard-type` runs
THEN a migration file is created in prisma/migrations/
AND the migration adds column `type VARCHAR` nullable to `flashcards` table
AND existing rows remain with NULL type (no data transformation)
```

### REQ-001.3 — Zod Card Schemas
```
GIVEN createCardSchema and updateCardSchema in src/features/cards/schemas/
WHEN schema is parsed with { type: "new-word" }
THEN it passes validation
WHEN schema is parsed with { type: null } or type omitted
THEN it passes validation with type resolved to null
WHEN schema is parsed with { type: "invalid-value" }
THEN it fails validation with a descriptive error
```
- `createCardSchema`: `type: z.enum(['new-word']).nullable().optional().default(null)`
- `updateCardSchema`: `type: z.enum(['new-word']).nullable().optional()` — omit `.default(null)` so partial PATCH without `type` does not overwrite existing value

### REQ-001.4 — Card API Endpoints
```
GIVEN an existing flashcard
WHEN PATCH /api/v1/sets/[setId]/cards/[cardId] with body { type: "new-word" }
THEN response 200 with card object containing type: "new-word"
WHEN POST /api/v1/sets/[setId]/cards with body { front, back, type: "new-word" }
THEN response 201 with card object containing type: "new-word"
```
- Response card shape MUST include `type` field
- `FlashcardItem` type in `src/features/sets/api/sets-api.ts` MUST include `type: string | null`

### REQ-001.5 — updateCard Client Mutation
```
GIVEN no updateCard mutation exists in useSetMutations
WHEN a card's type is toggled in the UI
THEN a new updateCard mutation MUST be added calling PATCH /api/v1/sets/[setId]/cards/[cardId]
AND the mutation invalidates the cards query on success
```

---

## REQ-002: Card Editor UI

### REQ-002.1 — Type Toggle in Card Add Form
```
GIVEN a user is in the CardEditor adding a new card
WHEN they check "Từ mới (luyện viết CJK)"
THEN the new card is created with type: "new-word"
WHEN they leave it unchecked
THEN the new card is created with type: null
```
- Use `Checkbox` (already in codebase) labeled "Từ mới (luyện viết CJK)"
- Checkbox state maps: checked → `type = "new-word"`, unchecked → `type = null`
- State is local form state; submitted as part of `createCard.mutate`

### REQ-002.2 — Inline Type Toggle on Existing Cards
```
GIVEN a user views the card list in CardEditor
WHEN they see a card row (SortableCardRow)
THEN a Checkbox "Từ mới" MUST be visible on each row
WHEN they toggle it
THEN updateCard mutation fires with { type: "new-word" | null }
AND the list updates optimistically
```

### REQ-002.3 — Visual Badge in Card List
```
GIVEN a card with type === "new-word" appears in CardEditor (SortableCardRow)
WHEN the card row renders
THEN a small Badge component with text "Từ mới" is shown on the row
```
*Card rows render inside `CardEditor` → `SortableCardRow`, not in `SetDetailClient` directly.*

---

## REQ-003: Study Mode Registration

### REQ-003.1 — Zod Schema Extension
```
GIVEN studyModeSchema in src/features/study/schemas/study.schema.ts
WHEN updated to include 'DRAW'
THEN z.enum(['FLASHCARD', 'LEARN', 'WRITE', 'TEST', 'DRAW']) is the schema
AND StudyModeValue TypeScript type includes 'DRAW'
```

### REQ-003.2 — Prisma Enum Extension
```
GIVEN enum StudyMode in prisma/schema.prisma (lines 16-21)
WHEN updated to include DRAW
THEN the enum has: FLASHCARD, LEARN, WRITE, TEST, DRAW
AND a new migration is created: add-draw-study-mode
AND `pnpm prisma generate` updates @prisma/client
```
*Note: Prisma migration is separate from the Flashcard type migration (REQ-001.2).*

### REQ-003.3 — StudySettingsForm Mode List
```
GIVEN StudySettingsForm with prop newWordCount: number
WHEN newWordCount > 0
THEN DRAW option in mode select is enabled and selectable
WHEN newWordCount === 0
THEN DRAW option is disabled (SelectItem disabled prop)
AND helper text below the select shows: "Không có thẻ 'từ mới' trong bộ này"
```
- `StudySettingsFormProps` MUST add `newWordCount: number`
- `MODES` MUST be built inside the component (or via factory `getModes(newWordCount)`) — not at module scope
- Do NOT wrap disabled `SelectItem` in Tooltip (disabled items don't receive pointer events)

### REQ-003.4 — Session API: DRAW Enum Valid Value
```
GIVEN POST /api/v1/study/sessions
WHEN body contains { mode: "DRAW" } AND the set has new-word cards
THEN session creation succeeds (201)
WHEN body contains { mode: "DRAW" } AND the set has 0 new-word cards
THEN session creation fails with ApiError('DRAW_NO_CARDS', "Bộ thẻ này không có từ nào được đánh dấu là 'từ mới'. Hãy đánh dấu ít nhất một thẻ trước khi dùng chế độ Vẽ.", 422)
```
*Clarification: REQ-003.4 and REQ-004.1 are consistent. Session creation succeeds when cards exist; throws when pool is empty. The 422 guard runs inside the service after card filtering.*

### REQ-003.5 — Study Settings Page: Pass newWordCount
```
GIVEN the study settings page renders StudySettingsForm
WHEN the page loads
THEN it queries count of cards WHERE type='new-word' AND setId=current
AND passes result as newWordCount prop to StudySettingsForm
```

---

## REQ-004: Draw Mode Card Filtering

### REQ-004.1 — study.service.ts Filter
```
GIVEN study.service createSession is called with mode: 'DRAW'
WHEN the set has cards where type === 'new-word'
THEN only those cards are included in the session pool
WHEN the set has 0 cards with type === 'new-word'
THEN throw new ApiError('DRAW_NO_CARDS', "Bộ thẻ này không có từ nào được đánh dấu là 'từ mới'. Hãy đánh dấu ít nhất một thẻ trước khi dùng chế độ Vẽ.", 422)
```
- Other modes (FLASHCARD, LEARN, WRITE, TEST) MUST NOT be affected

---

## REQ-005: Draw Mode Route

### REQ-005.1 — Page File
```
GIVEN src/app/(app)/sets/[setId]/draw/page.tsx does not exist
WHEN created following write/page.tsx pattern
THEN it renders <StudyPageClient setId={setId} mode="DRAW" />
AND is an async server component (params: Promise<{setId: string}>)
```

### REQ-005.2 — StudyPageClient Registration
```
GIVEN StudyPageClient maps modes to components
WHEN mode is 'DRAW'
THEN DrawMode component is rendered (loaded via dynamic(..., { ssr: false }))
AND titles['DRAW'] === 'Draw'
```

### REQ-005.3 — Navigation
```
GIVEN StudySettingsForm with mode='DRAW' and sessionId
WHEN handleStart completes
THEN router.push is called with /sets/[setId]/draw?sessionId=...
(existing modeParam = mode.toLowerCase() logic handles this automatically)
```

---

## REQ-006: HanziWriterCanvas Component

### REQ-006.1 — Dependency
- `hanzi-writer` MUST be installed as production dependency (`pnpm add hanzi-writer`)
- Types are bundled; no `@types/hanzi-writer` needed (verify on install)

### REQ-006.2 — Component Contract
```
GIVEN HanziWriterCanvas receives { character: string, back: string, onComplete: (isCorrect: boolean) => void }
WHEN character is a single CJK character in hanzi-writer dataset
THEN HanziWriter.create mounts on the container ref
AND writer.quiz() starts with onMistake, onComplete callbacks
AND mistake count tracked in ref (not state, to avoid re-renders)
AND isCorrect = totalMistakes <= MAX_MISTAKES (default 3)
AND a "Xóa" (Clear) button resets the current stroke
WHEN component unmounts
THEN writer.cancelQuiz() is called for cleanup
```
- Props: `character: string`, `back: string` (fallback prompt context), `onComplete: (isCorrect: boolean) => void`
- No `onReset` prop needed (clear is internal button state)
- `MAX_MISTAKES = 3` exported as named const from `src/features/study/lib/draw-config.ts`

### REQ-006.3 — Data Loading
```
GIVEN hanzi-writer loads data from jsdelivr CDN by default
WHEN network is available
THEN character data loads automatically, no self-hosting needed in v1
WHEN network fails or CDN times out
THEN onLoadCharDataError callback triggers fallback UI (REQ-006.4)
```

### REQ-006.4 — Fallback for Unsupported Characters
```
GIVEN character is multi-character, non-CJK, or not in hanzi-writer dataset
OR CDN fails to load
WHEN HanziWriterCanvas detects the failure
THEN show: "Ký tự này không hỗ trợ vẽ tay"
AND show a Textarea for manual text input (compare answer against currentCard.front using fuzzyMatch)
NOTE: In Draw mode, front=character to draw, back=definition/prompt.
      Fallback textarea compares user input against currentCard.front (NOT .back).
```
*Distinction from WriteMode: WriteMode shows `front` and expects user to type `back`. Draw mode shows `back` and expects user to draw/type `front`.*

### REQ-006.5 — Stroke Visual Feedback
```
GIVEN user draws a stroke on the canvas
WHEN the stroke is correct
THEN brief green visual feedback (hanzi-writer default highlight)
WHEN the stroke is incorrect
THEN red flash, stroke removed, user retries
WHEN totalMistakes for current stroke reaches showHintAfterMisses (3)
THEN hanzi-writer shows the hint stroke automatically (built-in behavior)
```
*Green/red feedback uses hanzi-writer's built-in rendering — no custom CSS needed.*

---

## REQ-007: DrawMode Component

### REQ-007.1 — Component Contract
```
GIVEN DrawMode renders with setId
WHEN session loads
THEN useStudySession(setId, 'DRAW') is called
AND loading/error states render appropriately
```

### REQ-007.2 — Session State UI
```
GIVEN DrawMode is active
THEN StudyProgress (reuse existing) shows current index / round total
GIVEN round ends
THEN RoundSummary (reuse existing) shows round results
GIVEN session complete
THEN SessionComplete (reuse existing) shows final score
```

### REQ-007.3 — Card Display
```
GIVEN currentCard is active in DRAW mode
THEN show currentCard.back as the prompt (definition → user draws the character)
AND render HanziWriterCanvas with character={currentCard.front}
GIVEN character.length !== 1
THEN show fallback UI from REQ-006.4 (multi-char edge case)
```

### REQ-007.4 — Answer Recording
```
GIVEN HanziWriterCanvas.onComplete fires with isCorrect
THEN study.recordRoundAnswer(cardId, isCorrect) is called first and return value captured as roundEnded
THEN study.recordAnswer(cardId, isCorrect) is called (async)
THEN briefly show currentCard.back + currentCard.front together for HINT_DISPLAY_MS (1500ms)
THEN if roundEnded is true
  THEN show RoundSummary (same state machine as WriteMode: showSummary, lastRoundIndex, etc.)
  ELSE call study.nextCard()
```
*`recordRoundAnswer` MUST be called before `recordAnswer`. RoundSummary wiring MUST mirror WriteMode.tsx (showSummary, roundEndedThisStep, finishIfLast pattern).*

---

## REQ-008: Pure Logic Extraction

### REQ-008.1 — Draw Config Module
```
GIVEN draw-specific constants exist
THEN they MUST live in src/features/study/lib/draw-config.ts
THEN file exports: MAX_MISTAKES = 3, CANVAS_SIZE = 280, CANVAS_PADDING = 5, HINT_DISPLAY_MS = 1500
```
*Prevents magic numbers inline in components.*

---

## REQ-009: Tests

### REQ-009.1 — studyModeSchema test
- Existing or new test MUST verify `studyModeSchema` parses `'DRAW'` successfully

### REQ-009.2 — study.service.ts DRAW tests
- Test: DRAW mode session includes only type='new-word' cards
- Test: DRAW mode with 0 new-word cards throws ApiError with status 422

### REQ-009.3 — Card schema tests
- Test: `createCardSchema` accepts `{ type: 'new-word' }`
- Test: `createCardSchema` accepts `{ type: null }`
- Test: `createCardSchema` rejects `{ type: 'invalid' }`

### REQ-009.4 — draw-config constants test
- Test: `MAX_MISTAKES === 3`, `CANVAS_SIZE === 280`

---

## Non-Functional Requirements

- `hanzi-writer` loaded client-side only (SSR: false)
- Draw mode disabled gracefully in UI when no new-word cards
- Zero breaking changes to existing study modes (FLASHCARD, LEARN, WRITE, TEST)
- DB migrations are additive-only (no data transformation)
- Error class: `ApiError` from `src/lib/api-error.ts` (NOT `AppError`)
- HTTP error code for empty pool: 422 with code `'DRAW_NO_CARDS'`
