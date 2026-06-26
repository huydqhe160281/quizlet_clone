# Tasks: CJK Draw Mode
> Revision 5 — saturation check Iteration 2 fixes

> Phase 1 phải hoàn thành trước. Phase 2–5 có thể làm song song sau Phase 1.

---

## Phase 1: DB + Schema Foundation

### T-001 — Prisma: Add `type` to Flashcard + migration
**Files**: `prisma/schema.prisma`
```diff
model Flashcard {
  // existing fields...
+ type      String?
```
Run: `pnpm prisma migrate dev --name add-flashcard-type`
Run: `pnpm prisma generate`
**Specs**: REQ-001.1, REQ-001.2
**AC**: Migration file exists in `prisma/migrations/`; `Flashcard` type in `@prisma/client` includes `type?: string | null`

### T-002 — Prisma: Add DRAW to StudyMode enum + migration
**Files**: `prisma/schema.prisma` (lines 16-21)
```diff
enum StudyMode {
  FLASHCARD
  LEARN
  WRITE
  TEST
+ DRAW
}
```
Run: `pnpm prisma migrate dev --name add-draw-study-mode`
Run: `pnpm prisma generate`
**Specs**: REQ-003.2
**AC**: `StudyMode.DRAW` exists in `@prisma/client`; no existing tests broken

### T-003 — Zod: Update card schemas
**Files**: `src/features/cards/schemas/` (find createCardSchema, updateCardSchema)
```ts
// createCardSchema only:
type: z.enum(['new-word']).nullable().optional().default(null)

// updateCardSchema (partial) — NO .default(null):
type: z.enum(['new-word']).nullable().optional()
```
**Also**: Update `FlashcardItem` in `src/features/sets/api/sets-api.ts` to add `type: string | null`
**Specs**: REQ-001.3, REQ-001.4
**AC**: Schema accepts `type: 'new-word'` and `type: null`; rejects `type: 'invalid'`

### T-004 — API: Card endpoints accept `type`
**Files**:
- `src/app/api/v1/sets/[setId]/cards/route.ts` (POST)
- `src/app/api/v1/sets/[setId]/cards/[cardId]/route.ts` (PATCH)
- `src/server/services/sets/card.service.ts` — pass `type` through in create/update data objects
**Specs**: REQ-001.4
**AC**: `PATCH .../cards/[id]` with `{ type: "new-word" }` returns updated card; response includes `type` field

### T-005 — Client: Add `updateCard` mutation to useSetMutations
**Files**: `src/features/sets/hooks/useSets.ts`
- Add `updateCard` mutation: `PATCH /api/v1/sets/[setId]/cards/[cardId]`
- Invalidate `setKeys.cards(setId)` on success (via `void queryClient.invalidateQueries({ queryKey: setKeys.cards(setId) })`)
- MUST add `onMutate` optimistic update mirroring `reorderCards` pattern (required for T-017 inline toggle UX)
**Specs**: REQ-001.5
**AC**: `updateCard.mutate({ setId, cardId, input: { type: 'new-word' } })` works end-to-end

### T-006 — Study Schema: Add DRAW to Zod enum
**Files**: `src/features/study/schemas/study.schema.ts`
```ts
export const studyModeSchema = z.enum(['FLASHCARD', 'LEARN', 'WRITE', 'TEST', 'DRAW']);
```
**Specs**: REQ-003.1
**AC**: `StudyModeValue` includes `'DRAW'`; TypeScript compiles cleanly

---

## Phase 2: Draw Mode UI

### T-007 — Create draw-config constants module
**File**: `src/features/study/lib/draw-config.ts` (new file)
```ts
export const MAX_MISTAKES = 3;
export const CANVAS_SIZE = 280;
export const CANVAS_PADDING = 5;
export const HINT_DISPLAY_MS = 1500;
```
**Specs**: REQ-008.1
**AC**: File exists; imports work in HanziWriterCanvas

### T-008 — Install hanzi-writer
```bash
pnpm add hanzi-writer
```
Verify TypeScript types: check `node_modules/hanzi-writer` for `.d.ts` files. If absent: `pnpm add -D @types/hanzi-writer`
Also verify API: `onLoadCharDataError`, `cancelQuiz` exist in the installed version.
**Specs**: REQ-006.1
**AC**: `import HanziWriter from 'hanzi-writer'` compiles without errors

### T-009 — Create HanziWriterCanvas component
**File**: `src/features/study/components/draw/HanziWriterCanvas.tsx`

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { fuzzyMatch } from '@/lib/utils/fuzzy';
import { MAX_MISTAKES, CANVAS_SIZE, CANVAS_PADDING } from '@/features/study/lib/draw-config';

type Props = {
  character: string;
  back: string; // shown in fallback prompt
  onComplete: (isCorrect: boolean) => void;
};

export function HanziWriterCanvas({ character, back, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const mistakesRef = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [fallbackAnswer, setFallbackAnswer] = useState('');
  const [fallbackSubmitted, setFallbackSubmitted] = useState(false);

  useEffect(() => {
    if (!containerRef.current || loadError) return;
    if (character.length !== 1) { setLoadError(true); return; }

    mistakesRef.current = 0;
    writerRef.current = HanziWriter.create(containerRef.current, character, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      padding: CANVAS_PADDING,
      showOutline: true,
      showHintAfterMisses: MAX_MISTAKES,
      onLoadCharDataError: () => setLoadError(true),
    });
    writerRef.current.quiz({
      onMistake: () => { mistakesRef.current += 1; },
      onComplete: () => onComplete(mistakesRef.current <= MAX_MISTAKES),
    });
    return () => { writerRef.current?.cancelQuiz(); };
  }, [character, loadError]);

  if (loadError) {
    const msg = character.length !== 1
      ? 'Chỉ hỗ trợ một ký tự CJK mỗi thẻ.'
      : 'Không tải được dữ liệu ký tự';
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">{msg}</p>
        <p className="text-xs text-muted-foreground text-center">Nhập câu trả lời:</p>
        <Textarea
          value={fallbackAnswer}
          onChange={(e) => setFallbackAnswer(e.target.value)}
          placeholder={`Nhập: ${back}`}
          disabled={fallbackSubmitted}
        />
        {!fallbackSubmitted && (
          <Button className="w-full" onClick={() => {
            setFallbackSubmitted(true);
            onComplete(fuzzyMatch(fallbackAnswer, character));
          }} disabled={!fallbackAnswer.trim()}>
            Kiểm tra
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={containerRef} className="rounded-xl border border-border bg-background shadow-inner" />
      <Button variant="outline" size="sm" onClick={() => writerRef.current?.cancelQuiz()
        .then(() => { mistakesRef.current = 0; writerRef.current?.quiz({
          onMistake: () => { mistakesRef.current += 1; },
          onComplete: () => onComplete(mistakesRef.current <= MAX_MISTAKES),
        }); })}>
        Xóa
      </Button>
    </div>
  );
}
```
**Specs**: REQ-006.2, REQ-006.3, REQ-006.4, REQ-006.5
**AC**: Canvas renders; quiz validates strokes; Clear button resets; fallback textarea fires fuzzyMatch against `character` (front), not `back`

### T-010 — Create DrawMode component
**File**: `src/features/study/components/draw/DrawMode.tsx`

Follow WriteMode.tsx structure exactly (copy state machine: showSummary, roundEndedThisStep, lastRoundIndex, lastRoundCorrect, lastRoundTotal, finishIfLast):
- `useStudySession(setId, 'DRAW')`
- Prompt: `currentCard.back` (show meaning → user draws the character)
- Render `<HanziWriterCanvas character={currentCard.front} back={currentCard.back} onComplete={handleComplete} />`
- `handleComplete(isCorrect)`:
  1. Save round stats before recording (same as WriteMode lines 72-74)
  2. `const roundEnded = study.recordRoundAnswer(currentCard.cardId, isCorrect)`
  3. `await study.recordAnswer(currentCard.cardId, isCorrect)`
  4. Show post-card hint (`currentCard.back + currentCard.front`) for `HINT_DISPLAY_MS` via `setTimeout`
  5. In timeout callback: if `roundEnded` → set `showSummary(true)` (or `completeSession` if `study.isComplete`); else `study.nextCard()`
- Implement `finishIfLast` pattern from WriteMode for advancing after hint display
- Show `StudyProgress`, `RoundSummary`, `SessionComplete` (reuse from shared/)
- Show loading/error states
**Specs**: REQ-007.1, REQ-007.2, REQ-007.3, REQ-007.4
**AC**: Full session flow mirrors WriteMode round engine; RoundSummary shown between rounds; `recordRoundAnswer` before `recordAnswer`; hint shown 1.5s after completion

### T-011 — Add DRAW to StudyPageClient
**Files**: `src/features/study/components/StudyPageClient.tsx`
```ts
const DrawMode = dynamic(
  () => import('@/features/study/components/draw/DrawMode').then((m) => m.DrawMode),
  { ssr: false, loading: studyLoading }
);
// Add to titles: DRAW: 'Draw'
// Add to mode map: DRAW: DrawMode
```
**Specs**: REQ-005.2
**AC**: `<StudyPageClient mode="DRAW" />` renders DrawMode

### T-012 — Create draw route page
**File**: `src/app/(app)/sets/[setId]/draw/page.tsx`
```tsx
import { StudyPageClient } from '@/features/study/components/StudyPageClient';
type PageProps = { params: Promise<{ setId: string }> };
export default async function DrawStudyPage({ params }: PageProps) {
  const { setId } = await params;
  return <StudyPageClient setId={setId} mode="DRAW" />;
}
```
**Specs**: REQ-005.1
**AC**: `/sets/[id]/draw` route renders without 404

---

## Phase 3: Study Settings Integration

### T-013 — study.service.ts: Filter cards for DRAW + ApiError
**File**: `src/server/services/study/study.service.ts`

When `mode === 'DRAW'`, filter card pool:
```ts
import { ApiError } from '@/lib/api-error';
// ...
const drawCards = allCards.filter(c => c.type === 'new-word');
if (drawCards.length === 0) {
  throw new ApiError(
    'DRAW_NO_CARDS',
    "Bộ thẻ này không có từ nào được đánh dấu là 'từ mới'. Hãy đánh dấu ít nhất một thẻ trước khi dùng chế độ Vẽ.",
    422
  );
}
// use drawCards instead of allCards for DRAW
```
Other modes use `allCards` unchanged.
**Specs**: REQ-003.4, REQ-004.1
**AC**: DRAW session creates with only new-word cards; 422 thrown with `DRAW_NO_CARDS` code when none exist

### T-014 — StudySettingsForm: Add DRAW mode option + newWordCount prop
**Files**: `src/features/study/components/StudySettingsForm.tsx`
```ts
type StudySettingsFormProps = {
  setId: string;
  totalCards: number;
  newWordCount: number;
};

// Inside component body (NOT module scope):
const modes: { value: StudyModeValue; label: string; disabled?: boolean }[] = [
  { value: 'FLASHCARD', label: 'Flashcards' },
  { value: 'LEARN', label: 'Learn' },
  { value: 'WRITE', label: 'Write' },
  { value: 'TEST', label: 'Test' },
  { value: 'DRAW', label: 'Draw (CJK)', disabled: newWordCount === 0 },
];

// In JSX, after Select:
{newWordCount === 0 && (
  <p className="text-xs text-muted-foreground">
    Không có thẻ &apos;từ mới&apos; trong bộ này
  </p>
)}
```
**Specs**: REQ-003.3
**AC**: DRAW option visible; disabled when `newWordCount === 0`; helper text shown below select (no Tooltip on disabled item)

### T-015 — Pass newWordCount from study page
**Files**: `src/app/(app)/sets/[setId]/study/page.tsx`
- Query: count flashcards WHERE setId AND type = 'new-word'
- Pass result as `newWordCount` to `StudySettingsForm`
**Specs**: REQ-003.5
**AC**: Study settings page shows correct enabled/disabled state for DRAW mode

---

## Phase 4: Card Editor UI

### T-016 — CardEditor: Add `type` Checkbox to ADD form
**File**: `src/features/cards/components/CardEditor.tsx`
- Add `const [cardType, setCardType] = useState<'new-word' | null>(null)` to form state
- Add `<Checkbox>` labeled "Từ mới (luyện viết CJK)" below existing fields
- Pass `type: cardType` in `createCard.mutate(..., { input: { front, back, ..., type: cardType } })`
- Reset `cardType` to `null` in `onSuccess`
**Specs**: REQ-002.1
**AC**: New cards created with correct `type`; no regression on other fields

### T-017 — CardEditor: Inline type toggle on SortableCardRow
**File**: `src/features/cards/components/CardEditor.tsx` — `SortableCardRow` component
- Add `updateCard` from `useSetMutations()` to `CardEditor`
- Pass `onTypeToggle: (cardId: string, newType: 'new-word' | null) => void` prop to `SortableCardRow`
- Add `Checkbox` "Từ mới" in the row, checked when `card.type === 'new-word'`
- `onCheckedChange`: call `updateCard.mutate({ setId, cardId: card.id, input: { type: checked ? 'new-word' : null } })`
- Add optimistic update in mutation `onMutate`: update `setKeys.cards(setId)` cache immediately (mirror `reorderCards` pattern in `useSets.ts`)
**Specs**: REQ-002.2
**AC**: Existing card `type` toggleable inline; list updates optimistically without full refetch

### T-018 — SortableCardRow: Badge for new-word cards
**File**: `src/features/cards/components/CardEditor.tsx` — `SortableCardRow` component
- Import `Badge` from `@/components/ui/badge`
- In card row front column, show `{card.type === 'new-word' && <Badge variant="secondary">Từ mới</Badge>}`
**Specs**: REQ-002.3
**AC**: Badge visible on new-word cards in CardEditor list (NOT SetDetailClient — rows live in SortableCardRow)

---

## Phase 5: Tests

### T-019 — Update study.schema tests (or create)
**File**: `src/features/study/schemas/study.schema.test.ts` (create if missing)
```ts
it('studyModeSchema accepts DRAW', () => {
  expect(studyModeSchema.parse('DRAW')).toBe('DRAW');
});
```
**Specs**: REQ-009.1

### T-020 — study.service DRAW mode unit tests
**File**: `src/server/services/study/study.service.test.ts`
- Test: DRAW mode creates session with only type='new-word' cards
- Test: DRAW mode with 0 new-word cards throws ApiError with status 422 and code 'DRAW_NO_CARDS'
**Specs**: REQ-009.2

### T-021 — Card schema tests
**File**: `src/features/cards/schemas/card.schema.test.ts` (create if missing)
- Test: `createCardSchema` accepts `{ front, back, type: 'new-word' }`
- Test: `createCardSchema` accepts `{ front, back, type: null }`
- Test: `createCardSchema` rejects `{ front, back, type: 'invalid' }`
- Test: `updateCardSchema` accepts `{ type: null }` and `{ type: 'new-word' }`
- Test: `updateCardSchema.parse({})` does NOT inject `type: null` (no default on partial update)
**Specs**: REQ-009.3

### T-022 — draw-config constants test
**File**: `src/features/study/lib/draw-config.test.ts`
```ts
import { MAX_MISTAKES, CANVAS_SIZE } from './draw-config';
it('MAX_MISTAKES is 3', () => expect(MAX_MISTAKES).toBe(3));
it('CANVAS_SIZE is 280', () => expect(CANVAS_SIZE).toBe(280));
```
**Specs**: REQ-009.4

### T-023 — CardEditor type toggle component test
**File**: `src/features/cards/components/CardEditor.type-toggle.test.tsx` (create)
- Test: add form checkbox sets `type: 'new-word'` on create
- Test: SortableCardRow inline toggle calls `updateCard` with correct payload
**Specs**: REQ-002 (delta spec.md)

### T-024 — HanziWriterCanvas component test
**File**: `src/features/study/components/draw/HanziWriterCanvas.test.tsx` (create)
- Test: fallback compares against `character` (front), not `back`
- Test: multi-char front shows fallback message
**Specs**: REQ-006 (delta spec.md)

### T-025 — DrawMode component test
**File**: `src/features/study/components/draw/DrawMode.test.tsx` (create)
- Test: prompt shows `back`, canvas receives `front` as character
- Test: `recordRoundAnswer` called before `recordAnswer` on complete
**Specs**: REQ-007 (delta spec.md)

---

## Phase 6: Documentation Impact

### T-026 — Update README / docs for Draw mode
**File**: `README.md` (study modes section)
- Document new `DRAW` study mode
- Note CJK-only, requires `type = 'new-word'` on flashcards
**Specs**: documentation-sync workspace rule

---

## Dependency Graph

```
T-001 (Flashcard.type migration)
T-002 (StudyMode.DRAW migration) ← independent of T-001
T-003 (Zod card schemas + FlashcardItem) ← needs T-001 complete
T-004 (card API endpoints) ← needs T-003
T-005 (updateCard mutation) ← needs T-004
T-006 (Zod studyModeSchema DRAW) ← needs T-002

T-007 (draw-config constants) ← independent
T-008 (install hanzi-writer) ← independent
T-009 (HanziWriterCanvas) ← needs T-007, T-008
T-010 (DrawMode) ← needs T-009, T-006
T-011 (StudyPageClient) ← needs T-010, T-006
T-012 (draw route page) ← needs T-011

T-013 (study.service filter) ← needs T-001, T-002, T-006
T-014 (StudySettingsForm) ← needs T-006
T-015 (study page newWordCount) ← needs T-014, T-003

T-016 (CardEditor add form toggle) ← needs T-004, T-005
T-017 (SortableCardRow type toggle) ← needs T-016, T-005
T-018 (SortableCardRow badge) ← needs T-003

T-019–T-025 (tests) ← needs respective implementation tasks
T-026 (docs) ← needs T-010 complete
```

---

## Verification Checklist

- [ ] **T-001/T-002**: `pnpm prisma migrate dev` applies both migrations; `pnpm prisma generate` succeeds; `@prisma/client` exports `Flashcard.type` and `StudyMode.DRAW`
- [ ] **T-003/T-004**: `PATCH /api/v1/sets/[setId]/cards/[cardId]` with `{ type: "new-word" }` returns 200 and response includes `type`
- [ ] **T-005**: `updateCard.mutate` invalidates `setKeys.cards(setId)`; toggle persists after page refresh
- [ ] **T-013**: DRAW session with 0 new-word cards returns HTTP 422 with code `DRAW_NO_CARDS` and canonical Vietnamese message
- [ ] **T-013**: DRAW session with mixed cards only includes `type === 'new-word'` cards in session pool
- [ ] **T-014/T-015**: Study settings disables DRAW when `newWordCount === 0`; helper text visible; enabled when count > 0
- [ ] **T-009**: HanziWriterCanvas fallback compares user input against `character` (front), not `back`
- [ ] **T-010**: DrawMode shows RoundSummary between rounds (same flow as WriteMode); calls `recordRoundAnswer` before `recordAnswer`
- [ ] **T-012**: `/sets/[setId]/draw?sessionId=...` route loads without 404
- [ ] **T-016/T-017/T-018**: New card checkbox, inline row toggle, and "Từ mới" badge all render in CardEditor
- [ ] **T-019–T-025**: `pnpm test` passes for study.schema, study.service DRAW tests, card schema, draw-config, and component tests
- [ ] **Regression**: Existing modes FLASHCARD, LEARN, WRITE, TEST still start sessions and complete without errors
- [ ] Run `./kit lint` — no new warnings in changed files
