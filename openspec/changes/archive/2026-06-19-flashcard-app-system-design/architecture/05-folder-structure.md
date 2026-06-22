# Folder Structure (Feature-Based Architecture)

## 1. Cấu trúc tổng thể

```
quizlet-clone/
├── src/
│   ├── middleware.ts           # Edge Middleware (auth guard, rate limit headers)
│   ├── app/                    # Next.js App Router pages & API
│   ├── features/               # Feature modules (business logic)
│   ├── components/             # Shared UI components
│   ├── server/                 # Server-only utilities
│   ├── lib/                    # Shared utilities & config
│   ├── hooks/                  # Shared React hooks
│   ├── stores/                 # Zustand stores
│   ├── types/                  # Global TypeScript types
│   └── styles/                 # Global CSS
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/                     # Static assets
├── tests/
│   ├── unit/                   # Jest unit tests
│   ├── integration/            # API route integration tests
│   └── e2e/                    # Playwright E2E tests
└── ...config files
```

## 2. App Router Structure (`src/app/`)

```
src/app/
├── layout.tsx                  # Root layout (fonts, providers)
├── page.tsx                    # Landing page (SSG)
├── globals.css
│
├── (auth)/                     # Auth route group (no sidebar)
│   ├── layout.tsx              # Auth layout (centered card)
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── forgot-password/
│   │   └── page.tsx
│   └── reset-password/
│       └── page.tsx            # Consumes ?token= query param
│
├── (app)/                      # Protected route group
│   ├── layout.tsx              # App layout (sidebar + navbar)
│   ├── dashboard/
│   │   └── page.tsx            # SSR: user stats + recent sessions
│   ├── sets/
│   │   ├── page.tsx            # User's sets list (SSR)
│   │   ├── new/
│   │   │   └── page.tsx        # Create set form (CSR)
│   │   └── [setId]/
│   │       ├── page.tsx        # Set detail (SSR + Streaming)
│   │       ├── edit/
│   │       │   └── page.tsx    # Edit set (CSR)
│   │       ├── study/
│   │       │   └── page.tsx    # Study mode selector
│   │       ├── flashcard/
│   │       │   └── page.tsx    # Flashcard mode (CSR)
│   │       ├── learn/
│   │       │   └── page.tsx    # Learn mode (CSR)
│   │       ├── write/
│   │       │   └── page.tsx    # Write mode (CSR)
│   │       └── test/
│   │           └── page.tsx    # Test mode (CSR)
│   ├── study/
│   │   └── page.tsx            # SM-2 due cards study (CSR)
│   ├── search/
│   │   └── page.tsx            # Full-text search (CSR)
│   ├── folders/
│   │   └── [folderId]/
│   │       └── page.tsx
│
├── (public)/                   # Public route group
│   ├── library/
│   │   └── page.tsx            # Public library (ISR 5min)
│   └── shared/
│       └── [setId]/
│           └── page.tsx        # Public set preview at /shared/[setId]
│
└── api/
    ├── auth/
    │   └── [...nextauth]/
    │       └── route.ts            # NextAuth handler (login, OAuth callbacks)
    └── v1/
        ├── auth/
        │   ├── register/route.ts         # POST — custom user creation (Credentials)
        │   ├── forgot-password/route.ts  # POST — generate token, send email
        │   ├── reset-password/route.ts   # POST — validate token, update password
        │   └── me/route.ts               # GET — current user profile
        ├── sets/
        │   ├── route.ts                    # GET, POST
        │   └── [setId]/
        │       ├── route.ts                # GET, PATCH, DELETE
        │       ├── duplicate/route.ts      # POST
        │       └── cards/
        │           ├── route.ts            # GET, POST
        │           ├── reorder/route.ts    # POST
        │           └── [cardId]/route.ts   # PATCH, DELETE
        ├── study/
        │   ├── due-cards/route.ts
        │   ├── review/route.ts
        │   └── sessions/
        │       ├── route.ts
        │       └── [sessionId]/
        │           ├── route.ts
        │           └── cards/route.ts
        ├── dashboard/
        │   ├── stats/route.ts
        │   ├── activity/route.ts
        │   └── recent-sessions/route.ts
        ├── search/route.ts
        ├── library/route.ts
        ├── upload/
        │   └── presigned-url/route.ts
        ├── folders/
        │   ├── route.ts
        │   └── [folderId]/
        │       ├── route.ts
        │       └── sets/
        │           ├── route.ts
        │           └── [setId]/route.ts
        └── tags/route.ts
```

## 3. Features Structure (`src/features/`)

**Nguyên tắc**: Mỗi feature là một module độc lập — chứa components, hooks, và actions/queries riêng. Feature không import từ feature khác (ngoại lệ: dùng shared `components/` và `lib/`).

```
src/features/
│
├── auth/
│   ├── components/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── GoogleButton.tsx
│   │   └── ForgotPasswordForm.tsx
│   ├── hooks/
│   │   └── useAuth.ts
│   └── schemas/
│       └── auth.schema.ts      # Zod schemas
│
├── sets/
│   ├── components/
│   │   ├── SetCard.tsx         # Set preview card
│   │   ├── SetGrid.tsx         # Grid of SetCards
│   │   ├── SetForm.tsx         # Create/Edit form
│   │   ├── SetHeader.tsx       # Set detail header
│   │   └── SetActions.tsx      # Duplicate, Delete, Share
│   ├── hooks/
│   │   ├── useSets.ts          # React Query hooks
│   │   └── useSetMutations.ts
│   ├── queries/
│   │   └── sets.queries.ts     # TanStack Query definitions
│   └── schemas/
│       └── set.schema.ts
│
├── cards/
│   ├── components/
│   │   ├── CardEditor.tsx      # Inline card editor
│   │   ├── CardList.tsx        # Virtualized card list
│   │   ├── CardItem.tsx
│   │   └── MediaUpload.tsx     # Image/audio upload
│   ├── hooks/
│   │   └── useCards.ts
│   └── schemas/
│       └── card.schema.ts
│
├── study/
│   ├── components/
│   │   ├── flashcard/
│   │   │   ├── FlashcardViewer.tsx   # Flip card 3D
│   │   │   ├── FlipCard.tsx          # Animation
│   │   │   └── CardNavigation.tsx
│   │   ├── learn/
│   │   │   ├── LearnQuestion.tsx
│   │   │   └── AnswerInput.tsx
│   │   ├── write/
│   │   │   ├── WritePrompt.tsx
│   │   │   └── FuzzyMatcher.tsx
│   │   ├── test/
│   │   │   ├── MultipleChoice.tsx
│   │   │   ├── TrueFalse.tsx
│   │   │   └── TypingQuestion.tsx
│   │   └── shared/
│   │       ├── StudyProgress.tsx     # Progress bar
│   │       ├── GradeButtons.tsx      # Again/Hard/Good/Easy
│   │       └── SessionComplete.tsx   # End screen
│   ├── hooks/
│   │   ├── useStudySession.ts
│   │   └── useSpacedRepetition.ts
│   └── lib/
│       └── sm2.ts              # SM-2 algorithm (pure function)
│
├── dashboard/
│   ├── components/
│   │   ├── StatsCards.tsx      # Streak, accuracy cards
│   │   ├── ActivityHeatmap.tsx # GitHub-style heatmap
│   │   ├── RecentSessions.tsx
│   │   └── DueCardsAlert.tsx   # "X cards due today"
│   └── hooks/
│       └── useDashboard.ts
│
├── search/
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── SearchResults.tsx
│   │   └── SearchFilters.tsx
│   └── hooks/
│       └── useSearch.ts
│
└── library/
    ├── components/
    │   ├── LibraryGrid.tsx
    │   ├── LibraryFilters.tsx
    │   └── SortTabs.tsx        # Trending / Most Studied / Newest
    └── hooks/
        └── useLibrary.ts
```

## 4. Shared Components (`src/components/`)

```
src/components/
├── ui/                         # shadcn/ui components (auto-generated)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── layout/
│   ├── Sidebar.tsx
│   ├── Navbar.tsx
│   ├── MobileNav.tsx
│   └── PageHeader.tsx
└── shared/
    ├── EmptyState.tsx          # Reusable empty state
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    ├── VirtualList.tsx         # react-virtual wrapper
    ├── ImageWithFallback.tsx
    └── ConfirmDialog.tsx
```

## 5. Server Layer (`src/server/`)

```
src/server/
├── db.ts                       # Prisma client singleton
├── auth.ts                     # NextAuth config — exports handlers, auth(), signIn, signOut (NextAuth v5)
└── services/
    ├── set.service.ts          # FlashcardSet business logic
    ├── card.service.ts         # Flashcard business logic
    ├── study.service.ts        # Study session + SM-2 integration
    ├── search.service.ts       # Full-text search queries
    ├── upload.service.ts       # Supabase Storage integration
    └── stats.service.ts        # User stats + streak calculation
```

## 6. Lib Layer (`src/lib/`)

```
src/lib/
├── validations/
│   └── common.ts               # Shared Zod validators
├── utils/
│   ├── cn.ts                   # clsx + tailwind-merge helper
│   ├── format.ts               # Date, number formatting
│   └── fuzzy.ts                # Fuzzy string matching for Write mode
├── api-error.ts                # ApiError class
├── api-response.ts             # Typed response helpers
├── rate-limit.ts               # Rate limiting middleware
└── constants.ts                # App-wide constants
```

## 7. Stores (`src/stores/`) — Zustand

```
src/stores/
├── study.store.ts              # Current study session state
│   └── { cards, currentIndex, mode, sessionId, ... }
└── ui.store.ts                 # UI state (sidebar open, theme, ...)
```

## 8. Lý do thiết kế

| Quyết định | Lý do |
|---|---|
| Feature-based (không layer-based) | Scale tốt hơn: khi thêm feature mới, chỉ tạo thêm 1 folder — không scatter changes |
| `server/services/` tách riêng | Server-only code (Prisma) không bị leak vào client bundle |
| `features/*/schemas/` per feature | Zod schemas co-located với feature — dễ maintain |
| `components/ui/` là shadcn/ | Auto-generated, không custom — nhanh bootstrap |
| Zustand chỉ cho client state | React Query xử lý server state; Zustand chỉ cho ephemeral UI state |
| SM-2 là pure function trong `features/study/lib/` | Dễ unit test, không I/O |
