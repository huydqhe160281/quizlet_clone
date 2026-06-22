# System Decomposition

## 1. Dependency Graph

```
Infrastructure Setup
      │
      ▼
Authentication & User Management
      │
      ▼
Database Schema (Prisma Migrations)
      │
      ├─────────────────────────┐
      ▼                         ▼
FlashcardSet & Card CRUD    Media Upload (Supabase Storage)
      │                         │
      └────────────┬────────────┘
                   ▼
            Study Modes (4x)
                   │
                   ▼
         Spaced Repetition (SM-2)
                   │
                   ▼
            Dashboard & Stats
                   │
                   ├─────────────┐
                   ▼             ▼
          Full-Text Search   Public Library
                   │
                   ▼
           Polish & Security
```

**Key Dependencies:**
- Auth phải xong trước mọi feature (session required)
- Database schema phải migrate trước khi code services
- FlashcardSet/Card CRUD là tiền đề cho Study Modes
- Study Modes phải xong trước Spaced Repetition (cần session structure)
- Dashboard phụ thuộc vào ReviewHistory data từ Study + SM-2
- Search và Public Library độc lập với Dashboard, chỉ cần Sets/Cards data

---

## 2. Implementation Phases

### Phase 1: Foundation
- **Objective**: Project setup, infrastructure, CI/CD. App deploy lên Vercel ở trạng thái empty nhưng functional.
- **Boundaries**:
  - `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
  - `prisma/schema.prisma` (base User, Account, Session tables)
  - `prisma/migrations/20240101_init/`
  - `src/server/db.ts` (Prisma singleton)
  - `src/server/auth.ts` (NextAuth config)
  - `src/app/layout.tsx`, `src/app/globals.css`
  - `src/components/ui/` (shadcn/ui setup)
  - `.env.local`, `vercel.json`
  - Vercel deployment pipeline
- **Dependencies**: None

### Phase 2: Authentication
- **Objective**: Full auth flow — Email/Password, Google OAuth, password reset, protected routes.
- **Boundaries**:
  - `src/app/(auth)/` — login, register, forgot-password pages
  - `src/app/api/v1/auth/` — forgot-password, reset-password routes
  - `src/features/auth/` — components, hooks, Zod schemas
  - `src/middleware.ts` — Edge Middleware route protection
  - `src/lib/api-error.ts`, `src/lib/rate-limit.ts`
- **Dependencies**: Phase 1

### Phase 3: FlashcardSet & Card Management
- **Objective**: Full CRUD cho FlashcardSets và Flashcards, bao gồm inline editing, reorder, tagging, folders.
- **Boundaries**:
  - `prisma/migrations/20240102_sets_cards/` — FlashcardSet, Flashcard, Tag, SetTag, Folder, FolderSet
  - `src/app/(app)/sets/` — pages (SSR list, detail, create, edit)
  - `src/app/api/v1/sets/` — Route handlers
  - `src/app/api/v1/folders/`, `src/app/api/v1/tags/`
  - `src/features/sets/`, `src/features/cards/`
  - `src/server/services/set.service.ts`, `src/server/services/card.service.ts`
  - `src/app/api/v1/upload/presigned-url/` — Media upload
  - `src/server/services/upload.service.ts`
- **Dependencies**: Phase 1, Phase 2

### Phase 4: Study Modes
- **Objective**: 4 study modes đầy đủ (Flashcard, Learn, Write, Test) với UX mượt.
- **Boundaries**:
  - `prisma/migrations/20240103_study_sessions/` — StudySession, SessionCard
  - `src/app/(app)/sets/[setId]/flashcard/`, `/learn/`, `/write/`, `/test/`
  - `src/app/api/v1/study/sessions/` — Route handlers
  - `src/features/study/components/` — FlashcardViewer, LearnMode, WriteMode, TestMode
  - `src/server/services/study.service.ts`
  - `src/lib/utils/fuzzy.ts` — Fuzzy matching for Write mode
- **Dependencies**: Phase 1, Phase 2, Phase 3

### Phase 5: Spaced Repetition (SM-2)
- **Objective**: SM-2 algorithm tích hợp hoàn chỉnh — due cards queue, review submission, progress tracking.
- **Boundaries**:
  - `prisma/migrations/20240104_spaced_rep/` — CardProgress, ReviewHistory
  - `src/features/study/lib/sm2.ts` — Pure SM-2 function
  - `src/app/api/v1/study/due-cards/`, `/review/`
  - `src/app/(app)/study/` — SM-2 study page
  - `src/server/services/study.service.ts` (extend)
  - `src/features/study/hooks/useSpacedRepetition.ts`
- **Dependencies**: Phase 1, Phase 2, Phase 3, Phase 4

### Phase 6: Dashboard & Stats
- **Objective**: Dashboard với streak, accuracy, activity heatmap, recent sessions, due cards alert.
- **Boundaries**:
  - `prisma/migrations/20240105_user_stats/` — UserStats
  - `src/app/(app)/dashboard/` — Dashboard page (SSR + Streaming)
  - `src/app/api/v1/dashboard/` — stats, activity, recent-sessions routes
  - `src/features/dashboard/` — components, hooks
  - `src/server/services/stats.service.ts`
- **Dependencies**: Phase 1, Phase 2, Phase 4 (cần StudySession cho recent-sessions), Phase 5 (cần ReviewHistory cho streak + heatmap)

### Phase 7: Search & Public Library
- **Objective**: Full-text search, filters, và Public Library (trending, most_studied, newest).
- **Boundaries**:
  - `prisma/migrations/20240106_full_text_search/` — search_vector, GIN index, trigger
  - `src/app/(app)/` — search page
  - `src/app/(public)/library/` — Public library (ISR)
  - `src/app/(public)/shared/[setId]/` — Public set preview at `/shared/[setId]`
  - `src/app/api/v1/search/`, `/library/`
  - `src/features/search/`, `src/features/library/`
  - `src/server/services/search.service.ts`
- **Dependencies**: Phase 1, Phase 3, Phase 4 (cần StudySession cho most_studied/trending sorts)

### Phase 8: Polish, Security & Performance
- **Objective**: Production-ready — security headers, rate limiting, bundle optimization, Lighthouse > 90.
- **Boundaries**:
  - `next.config.ts` — security headers, image config, bundle analyzer
  - `src/middleware.ts` — rate limiting
  - `src/components/shared/` — VirtualList, ErrorBoundary, skeletons
  - Performance: lazy loading, code splitting, query optimization
  - E2E tests: `tests/e2e/`
  - Unit tests: `tests/unit/` (SM-2, services)
- **Dependencies**: All phases

---

## 3. Completeness Check

| Requirement từ system-brief.md | Phase | Status |
|---|---|---|
| Authentication (Email, Google, forgot-password) | Phase 2 | ✅ Covered |
| FlashcardSet CRUD (title, desc, language, visibility) | Phase 3 | ✅ Covered |
| Flashcard CRUD (front, back, image, audio, example) | Phase 3 | ✅ Covered |
| Media upload (Supabase Storage) | Phase 3 | ✅ Covered |
| Folders & Tags | Phase 3 | ✅ Covered |
| Flashcard Mode (flip, keyboard, swipe) | Phase 4 | ✅ Covered |
| Learn Mode | Phase 4 | ✅ Covered |
| Write Mode (fuzzy matching) | Phase 4 | ✅ Covered |
| Test Mode (MC, T/F, Typing) | Phase 4 | ✅ Covered |
| Spaced Repetition SM-2 | Phase 5 | ✅ Covered |
| Dashboard (streak, accuracy, heatmap) | Phase 6 | ✅ Covered |
| Full-text Search + filters | Phase 7 | ✅ Covered |
| Public Library (trending, most studied, newest) | Phase 7 | ✅ Covered |
| SSR + Streaming + Server Components | Phase 1+8 | ✅ Covered |
| Lighthouse > 90 | Phase 8 | ✅ Covered |
| Security (Zod, rate limit, CSP, CSRF) | Phase 2+8 | ✅ Covered |
| Vercel deployment | Phase 1 | ✅ Covered |

**Coverage**: 18/18 requirements covered ✅

---

## 4. Phase Dependency Validation

```
Phase 1 → no deps              ✅ Acyclic
Phase 2 → Phase 1              ✅ Acyclic
Phase 3 → Phase 1, 2           ✅ Acyclic (all prior phases)
Phase 4 → Phase 1, 2, 3        ✅ Acyclic (all prior phases)
Phase 5 → Phase 1, 2, 3, 4    ✅ Acyclic (all prior phases)
Phase 6 → Phase 1, 2, 4, 5     ✅ Acyclic (StudySession from Phase 4 needed for recent-sessions)
Phase 7 → Phase 1, 3           ✅ Acyclic (parallel track, no cycle)
Phase 8 → All phases           ✅ Acyclic (terminal phase)
```

**Dependency graph is acyclic** ✅ — No circular dependencies detected.

**Note**: Phase 6 (Dashboard) và Phase 7 (Search/Library) có thể chạy song song sau Phase 5, nhưng serial là safer để tránh migration conflicts.
