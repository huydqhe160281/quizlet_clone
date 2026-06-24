# Design Brief: CJK Draw Mode

## Feature Overview

Thêm tính năng học viết/vẽ CJK character cho Quizlet clone. Feature gồm hai phần tách biệt nhưng liên kết:

1. **Flashcard Type Field** — trường `type` trên `Flashcard` model, người dùng đánh dấu thủ công
2. **Draw Study Mode** — mode học mới dùng `hanzi-writer` để validate stroke-by-stroke

---

## Architecture

### Data Layer

**Prisma Flashcard model — thêm `type` field:**
```prisma
model Flashcard {
  // ... existing fields ...
  type      String?  // null | "new-word"
}
```

Migration: `add-flashcard-type`

**Zod schema cho card API** (`src/features/cards/schemas/`):
- `createCardSchema`: `type: z.enum(['new-word']).nullable().optional().default(null)`
- `updateCardSchema`: `type: z.enum(['new-word']).nullable().optional()` — **không** có `.default(null)` (tránh ghi đè type khi client omit field)

### Study Mode Registry

Mở rộng `studyModeSchema` (Zod enum):
```ts
z.enum(['FLASHCARD', 'LEARN', 'WRITE', 'TEST', 'DRAW'])
```

**Luồng DRAW mode:**
- Session được tạo với `mode: 'DRAW'`
- `study.service.ts` filter: chỉ lấy cards có `type === 'new-word'`  
- Nếu 0 cards thỏa điều kiện → throw `new ApiError('DRAW_NO_CARDS', '...', 422)` (dùng `ApiError` từ `src/lib/api-error.ts`, KHÔNG phải `AppError`)

### StudySettingsForm

Props mới: `newWordCount: number`

Logic hiển thị DRAW mode:
```tsx
const modes = [
  { value: 'FLASHCARD', label: 'Flashcards' },
  { value: 'LEARN', label: 'Learn' },
  { value: 'WRITE', label: 'Write' },
  { value: 'TEST', label: 'Test' },
  { value: 'DRAW', label: 'Draw (CJK)', disabled: newWordCount === 0 },
];
// Khi newWordCount === 0, helper text dưới Select (REQ-003.3):
// "Không có thẻ 'từ mới' trong bộ này"
```

### Draw Mode Component

**Library**: `hanzi-writer` (npm: `hanzi-writer`, 35kb, 10kb gzip)

**Component**: `src/features/study/components/draw/DrawMode.tsx`

**Architecture:**
```
DrawMode (mirrors WriteMode.tsx state machine)
├── useStudySession(setId, 'DRAW')
├── HanziWriterCanvas
│   ├── Props: { character, back, onComplete }
│   ├── HanziWriter.create(...) + writer.quiz(...)
│   ├── "Xóa" clear button
│   └── fallback textarea (fuzzyMatch against character/front)
├── StudyProgress / RoundSummary / SessionComplete (shared/)
└── finishIfLast → recordRoundAnswer → recordAnswer → hint → nextCard | RoundSummary
```

**HanziWriter Quiz Config:**
```ts
writer.quiz({
  onMistake: () => { mistakesRef.current += 1; },
  onComplete: () => {
    const isCorrect = mistakesRef.current <= MAX_MISTAKES;
    // DrawMode handleComplete:
    const roundEnded = recordRoundAnswer(cardId, isCorrect);
    await recordAnswer(cardId, isCorrect);
    // show hint 1.5s → roundEnded ? RoundSummary : nextCard()
  }
})
```

**Fallback**: Nếu hanzi-writer không có data cho character (non-CJK, rare chars) → hiển thị fallback textarea (giống WriteMode) kèm thông báo "Character không hỗ trợ vẽ tay, dùng gõ chữ".

### Route

**Page**: `src/app/(app)/sets/[setId]/draw/page.tsx`
```tsx
export default async function DrawStudyPage({ params }) {
  const { setId } = await params;
  return <StudyPageClient setId={setId} mode="DRAW" />;
}
```

### Card Editing UI

`src/features/cards/components/CardEditor.tsx` — có hai điểm cần thêm:

1. **ADD form**: Thêm `Checkbox` "Từ mới (luyện viết CJK)" trong form tạo card mới (dùng local state `cardType`)
2. **SortableCardRow**: Thêm `Checkbox` inline per-row + `Badge "Từ mới"` khi `type === 'new-word'`

**Note**: `Switch` component không có sẵn; dùng `Checkbox` (đã có tại `src/components/ui/checkbox.tsx`).
**Note**: Cần tạo thêm `updateCard` mutation trong `useSetMutations` (`src/features/sets/hooks/useSets.ts`).

---

## Component Interaction Diagram

```
User edits card
  → CardEditor toggle "new-word"
  → PATCH /api/v1/sets/[setId]/cards/[cardId] { type: "new-word" }
  → DB: flashcards.type = "new-word"

User opens study settings
  → StudySettingsForm receives newWordCount
  → DRAW mode enabled if newWordCount > 0

User starts DRAW session
  → POST /api/v1/study/sessions { mode: "DRAW" }
  → study.service: fetch cards WHERE type = "new-word"
  → Route: /sets/[setId]/draw?sessionId=xxx
  → DrawMode renders HanziWriterCanvas

User draws character
  → hanzi-writer validates stroke-by-stroke
  → onComplete: recordRoundAnswer(cardId, isCorrect) → recordAnswer(cardId, isCorrect)
  → show hint (back + front) 1.5s
  → roundEnded ? RoundSummary : nextCard()
```

---

## Phase Plan

| Phase | Scope | Dependencies |
|-------|-------|-------------|
| P1: DB + Schema | Add `type` field, card API update, Zod schemas | None |
| P2: Draw Mode UI | `DrawMode.tsx`, `HanziWriterCanvas`, route, StudyPageClient | P1 |
| P3: Settings Integration | StudySettingsForm DRAW option, newWordCount prop | P1 |
| P4: Card Editor | CardEditor toggle UI | P1 |

Phases P2, P3, P4 depend on P1 but are otherwise independent.

---

## Technical Constraints

- `hanzi-writer` must be loaded client-side only (`ssr: false`) — SVG rendering
- `hanzi-writer` data fetched from CDN by default; can self-host for offline
- **TWO Prisma migrations required**: (1) `add-flashcard-type` for `Flashcard.type String?`; (2) `add-draw-study-mode` for `StudyMode.DRAW` enum — Zod schema alone is not enough
- `StudyModeValue` type must be updated everywhere it appears as a string literal
- **Error class**: Use `ApiError` from `src/lib/api-error.ts` — signature: `new ApiError(code: string, message: string, status: number)`; HTTP 422 for empty DRAW pool
- **`Switch` not in codebase**: Use `Checkbox` from `src/components/ui/checkbox.tsx` instead
- **`updateCard` mutation** must be created in `useSets.ts` — currently only `createCard`, `deleteCard`, `deleteCards`, `reorderCards` exist
- Existing test suites for `study.service.ts` và `study.schema.ts` cần update
- **Fallback compare direction**: In Draw mode, `front` = character to draw, `back` = prompt/definition. Fallback textarea compares against `front` (NOT `back` like WriteMode)
