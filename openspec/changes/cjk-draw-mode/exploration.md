# Exploration: CJK Draw Mode (new-word flashcard type)

## Problem Statement

Người học CJK (Hán/Nhật/Hàn) cần thực hành **viết tay** để ghi nhớ cấu trúc nét bút của các chữ. Chỉ gõ phím (Write mode hiện tại) không đủ để rèn luyện trí nhớ nét chữ (stroke muscle memory). Không có cách nào để đánh dấu một flashcard là "cần học viết" và không có study mode hỗ trợ thực hành vẽ tay.

## Confirmed Understanding

- **What**: Thêm trường `type` (nullable: `null` | `"new-word"`) vào `Flashcard` model; xây dựng study mode "Draw" sử dụng canvas vẽ tay với stroke-order validation cho CJK characters
- **Why**: Học CJK đòi hỏi nhớ nét bút, gõ phím không đủ
- **Who**: Người dùng học CJK characters trong Quizlet clone
- **Inputs**: Canvas stroke data (chuột/touch), flashcard.front (chữ cần vẽ)
- **Outputs**: Correct/Incorrect verdict per stroke, saved session result
- **Scope**: type field + Draw study mode (new-word cards only)
- **Non-goals**: OCR freeform recognition, Trace mode, Latin handwriting, AI auto-tagging

## Current State Analysis

### Tech Stack
- Next.js 15 App Router + TypeScript + Prisma (PostgreSQL) + Tailwind + shadcn/ui
- Zod schemas, TanStack Query, Zustand store

### Existing Study Modes
| Mode | Schema Value | Route | Component |
|------|-------------|-------|-----------|
| Flashcard | `FLASHCARD` | `/sets/[id]/flashcard` | `FlashcardMode` |
| Learn | `LEARN` | `/sets/[id]/learn` | `LearnMode` |
| Write | `WRITE` | `/sets/[id]/write` | `WriteMode` |
| Test | `TEST` | `/sets/[id]/test` | `TestMode` |

### Mode Registration Points
1. `studyModeSchema` in `study.schema.ts` — zod enum
2. `MODES` array in `StudySettingsForm.tsx`
3. Route handler `/api/v1/study/sessions` validates mode
4. Route pages `/sets/[id]/[mode]/page.tsx`
5. `StudyPageClient.tsx` maps mode → component

### Flashcard Model (Prisma)
```prisma
model Flashcard {
  id        String   @id @default(cuid())
  setId     String
  front     String   @db.Text
  back      String   @db.Text
  example   String?  @db.Text
  imageUrl  String?
  audioUrl  String?
  sortOrder Int      @default(0)
  // MISSING: type field
}
```

### SetForm — card editing
`src/features/cards/components/CardEditor.tsx` — needs Checkbox for marking type = "new-word" (add form + SortableCardRow inline toggle)

## Algorithm Research

### Recommended: `hanzi-writer` library

**Why hanzi-writer is the right fit:**
- We know exactly which character the user should draw (from `flashcard.front`)
- hanzi-writer's `quiz()` mode validates strokes against known character stroke data
- Built-in per-stroke validation, hint system, completion callbacks
- 9000+ CJK characters (Simplified + Traditional Chinese)
- Only 35kb (10kb gzipped) — no model loading overhead
- Callbacks: `onCorrectStroke`, `onMistake`, `onComplete`
- No external API or AI/ML required

**Limitations:**
- Kana (Japanese): experimental support via separate dataset
- Hangul (Korean): not supported in v1 (future work)
- Characters not in the dataset will fail gracefully (show error state)

### Alternative Considered: hanzilookup-js
Freeform recognition — user draws any character and system guesses. Not suitable because we need to verify a *specific* target character stroke-by-stroke, not identify an unknown character.

### Alternative Considered: Google IME API
Requires API proxy, external dependency, CORS complexity. Overkill for in-quiz validation.

## Key Design Decisions

### D1: `type` field as nullable string vs enum
- **Decision**: Prisma `String?` with application-level enum (`null` | `"new-word"`)
- **Rationale**: Simple, extensible, avoids Prisma enum migration complexity. Can add more types later (e.g., "audio", "image") without new migrations.

### D2: Draw mode — only new-word cards
- Draw mode session filters to only `type === "new-word"` cards
- If set has 0 new-word cards → Draw mode disabled in StudySettingsForm (greyed out with tooltip)

### D3: Scoring / session recording
- Per-stroke validation by hanzi-writer
- Session `isCorrect = true` if user completes all strokes with ≤ N misses (configurable, default 3)
- Reuses existing `recordAnswer` API — no new endpoint needed

### D4: hanzi-writer rendering target
- Use SVG target (hanzi-writer default) inside a React wrapper component
- `useRef` on container div, instantiate writer on mount
- Clean up on unmount
