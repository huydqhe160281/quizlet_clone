# Implementation Tasks: flashcard-app-system-design

> **Note**: Sau khi hoàn thành thiết kế và chạy `/opsx-verify-spec`, mới bắt đầu implement theo thứ tự phase dưới đây.

---

## Phase 1: Foundation
**Objective**: Project setup hoàn chỉnh, CI/CD sẵn sàng, deploy empty app lên Vercel.
**Boundaries**: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `prisma/schema.prisma` (base), `src/server/db.ts`, `src/app/layout.tsx`, shadcn/ui setup, Vercel config.

- [x] Init Next.js 15 project: `pnpm create next-app@latest --typescript --tailwind --app --src-dir`
- [x] Create app shell: `src/app/(app)/layout.tsx` — Sidebar, Navbar, mobile navigation
- [x] Create `src/components/layout/Sidebar.tsx`, `Navbar.tsx`, `MobileNav.tsx`
- [x] Setup React Query provider: `src/app/layout.tsx` — wrap with `QueryClientProvider`
- [x] Configure TypeScript strict mode (`"strict": true` in tsconfig.json)
- [x] Install dependencies: `prisma`, `@prisma/client`, `next-auth`, `@auth/prisma-adapter`, `zod`, `@tanstack/react-query`, `zustand`, `bcryptjs`, `lru-cache`
- [x] Install dev dependencies: `@types/bcryptjs`, `prisma`, `@next/bundle-analyzer`
- [x] Setup shadcn/ui: `pnpm dlx shadcn@latest init`, add: button, input, card, dialog, badge, tabs, dropdown-menu, form, label, textarea, avatar, tooltip
- [x] Create `src/server/db.ts` — Prisma singleton with globalThis pattern
- [x] Create initial `prisma/schema.prisma` — User, Account, Session, VerificationToken tables
- [x] Run `pnpm prisma migrate dev --name init`
- [x] Configure `next.config.ts` — security headers, image domains (Supabase), bundle analyzer
- [x] Setup `.env.local` with all required variables (template in README)
- [ ] Deploy empty app to Vercel, verify build passes
- [ ] Setup Vercel Environment Variables (all 10 variables)
- [ ] Create Supabase `flashcard-media` storage bucket

---

## Phase 2: Authentication
**Objective**: Full auth flow — Email/Password, Google OAuth, password reset, protected routes.
**Boundaries**: `src/app/(auth)/`, `src/app/api/auth/`, `src/app/api/v1/auth/`, `src/features/auth/`, `src/middleware.ts`, `src/lib/api-error.ts`, `src/lib/rate-limit.ts`

- [x] **Write unit test**: `test_register_email_valid()` — verify bcrypt hash, user creation
- [x] **Write unit test**: `test_register_duplicate_email()` — verify 400 response
- [x] **Write unit test**: `test_reset_token_expiry()` — verify expired token rejected
- [x] Create `src/server/auth/auth.ts` — NextAuth config (Google + Credentials), JWT strategy, httpOnly cookie
- [x] Create Zod schemas: `loginSchema`, `registerSchema`, `forgotPasswordSchema` in `src/features/auth/schemas/`
- [x] Create `src/lib/api-error.ts` — ApiError class + withErrorHandler wrapper
- [x] Create `src/lib/rate-limit.ts` — LRU-based rate limiter (authRateLimit: 5/min, apiRateLimit: 100/min)
- [x] Create `src/middleware.ts` — Edge Middleware route guard for `/dashboard`, `/sets`, `/study`, `/folders` (redirect with `callbackUrl`)
- [x] Create `src/app/api/auth/[...nextauth]/route.ts`
- [x] Install email provider: `pnpm add resend` (or `nodemailer`)
- [ ] Add `RESEND_API_KEY` to Vercel environment variables
- [x] Create email template: forgot-password reset link email
- [x] Create `src/app/api/v1/auth/register/route.ts` — create user with bcrypt hash (custom endpoint, not NextAuth)
- [x] Create `src/app/api/v1/auth/forgot-password/route.ts` — generate VerificationToken, send email via Resend
- [x] Create `src/app/api/v1/auth/reset-password/route.ts` — validate token TTL (1h), update password hash
- [x] Create Login page `src/app/(auth)/login/page.tsx` — LoginForm + Google button
- [x] Create Register page `src/app/(auth)/register/page.tsx` — RegisterForm
- [x] Create Forgot Password page `src/app/(auth)/forgot-password/page.tsx`
- [x] Create Reset Password page `src/app/(auth)/reset-password/page.tsx` — consumes `?token=` query param
- [x] Wire `authRateLimit` to login (`/api/auth/[...nextauth]`) and register (`/api/v1/auth/register`) route handlers
- [x] Create `src/features/auth/components/` — LoginForm, RegisterForm, GoogleButton
- [x] **Run tests**: Verify all auth unit tests PASS
- [x] **E2E test**: `tests/e2e/auth/login.spec.ts` — email login (valid + invalid credentials), Google login (mocked)
- [x] **E2E test**: `tests/e2e/auth/google-oauth.spec.ts` — Google OAuth first-time + returning user (mocked provider; skipped when `GOOGLE_CLIENT_*` unset)
- [x] **E2E test**: `tests/e2e/auth/route-guard.spec.ts` — unauthenticated redirect to /login?callbackUrl=
- [x] **Scenario verification**: `Scenario: Successful Login`, `Scenario: Invalid Credentials`, `Scenario: Valid Reset Flow`, `Scenario: Successful Registration`, `Scenario: Duplicate Email`, `Scenario: Route Protection`, `Scenario: Cookie Flags` (covered by unit + E2E; reset flow manual with console link when Resend unset)

---

## Phase 3: FlashcardSet & Card Management
**Objective**: CRUD đầy đủ cho Sets/Cards, media upload, tags, folders.
**Boundaries**: `src/app/(app)/sets/`, `src/app/api/v1/sets/`, `/folders/`, `/tags/`, `/upload/`, `src/features/sets/`, `src/features/cards/`, `src/server/services/sets/set.service.ts`, `card.service.ts`, `upload.service.ts`

- [x] **Write integration test**: `test_create_set_valid()`, `test_update_set_forbidden()` (different user)
- [x] **Write integration test**: `test_duplicate_public_set()`
- [x] **Write integration test**: `test_upload_presigned_url_file_size_exceeded()`
- [x] Prisma migration: `pnpm prisma migrate dev --name sets_cards` — add FlashcardSet, Flashcard, Tag, SetTag, Folder, FolderSet
- [x] Create `src/server/services/sets/set.service.ts` — getSet, getSets, createSet, updateSet, deleteSet, duplicateSet (with ownership check)
- [x] Create `src/server/services/sets/card.service.ts` — getCards, createCard, updateCard, deleteCard, reorderCards
- [x] Create `src/server/services/upload.service.ts` — generatePresignedUrl (validate MIME + size)
- [x] Create all API route handlers under `src/app/api/v1/sets/` (CRUD + duplicate)
- [x] Create API route handlers under `src/app/api/v1/sets/[setId]/cards/` (CRUD + reorder)
- [x] Create API route handlers for `/folders/`, `/tags/`, `/upload/presigned-url/`
- [x] Create Sets list page `src/app/(app)/sets/page.tsx` — SSR with React Query prefetch
- [x] Create Set detail page `src/app/(app)/sets/[setId]/page.tsx` — SSR + Streaming
- [x] Create New Set page + SetForm component with validation
- [x] Create CardEditor component with inline edit + drag-and-drop reorder
- [x] Create MediaUpload component — presigned URL flow
- [x] Implement VirtualList in `src/components/shared/VirtualList.tsx` (react-virtual)
- [x] Setup React Query hooks: `useSets`, `useSetMutations`, `useCards`
- [x] Implement optimistic updates for set visibility toggle and card add/delete
- [x] **Run tests**: Verify integration tests PASS
- [x] **Scenario verification**: `Scenario: Unauthorized Update`, `Scenario: Delete Cascade`, `Scenario: File Size Violation`

---

## Phase 4: Study Modes
**Objective**: 4 study modes với UX mượt.
**Boundaries**: `src/app/(app)/sets/[setId]/flashcard/`, `/learn/`, `/write/`, `/test/`, `src/features/study/components/`, `src/server/services/study/study.service.ts`, `src/lib/utils/fuzzy.ts`, `StudySession`, `SessionCard` tables

- [x] **Write unit test**: `test_fuzzy_match_exact()`, `test_fuzzy_match_typo()`, `test_fuzzy_match_wrong()`
- [x] **Write integration test**: `test_study_session_created()`, `test_study_session_completed()`
- [x] Prisma migration: `pnpm prisma migrate dev --name study_sessions`
- [x] Create `src/lib/utils/fuzzy.ts` — Jaro-Winkler similarity function (threshold 0.85)
- [x] Create `src/server/services/study/study.service.ts` — createSession, completeSession, getSessionCards
- [x] Create API route handlers: `src/app/api/v1/study/sessions/`
- [x] Create `src/stores/study.store.ts` — Zustand store for study session state
- [x] Create FlashcardViewer component — CSS 3D flip + Framer Motion spring
- [x] Implement keyboard shortcuts (Space, ArrowLeft, ArrowRight) in FlashcardMode
- [x] Implement mobile swipe gesture in FlashcardMode
- [x] Create LearnMode components — Q&A with multiple choice
- [x] Create WriteMode component — textarea + fuzzy match evaluation
- [x] Create TestMode components — MC generator (1+3 distractors), T/F, Typing
- [x] Create shared: StudyProgress bar, GradeButtons (Again/Hard/Good/Easy), SessionComplete screen
- [x] Create study pages for each mode
- [x] **Run tests**: Verify unit + integration tests PASS
- [x] **E2E test**: `tests/e2e/study/flashcard-mode.spec.ts`
- [x] **Scenario verification**: `Scenario: Card Flip`, `Scenario: Keyboard Navigation`, `Scenario: Fuzzy Match`

---

## Phase 5: Spaced Repetition (SM-2)
**Objective**: SM-2 algorithm tích hợp, due cards queue.
**Boundaries**: `src/features/study/lib/sm2.ts`, `src/app/api/v1/study/due-cards/`, `/review/`, `CardProgress`, `ReviewHistory` tables

- [x] **Write unit tests for SM-2**: `test_sm2_first_review_good()`, `test_sm2_second_review_good()`, `test_sm2_hard_grade()`, `test_sm2_failed_again()`, `test_sm2_easy_boost()`, `test_sm2_ease_floor()`
- [x] **Write integration test**: `test_due_cards_query()`, `test_review_submission_creates_history()`
- [x] Create `src/features/study/lib/sm2.ts` — pure SM-2 function (grade 0-3)
- [x] Prisma migration: `pnpm prisma migrate dev --name spaced_repetition` — CardProgress, ReviewHistory
- [x] Create `src/app/api/v1/study/due-cards/route.ts` — query `dueDate <= NOW()` ordered by dueDate ASC
- [x] Create `src/app/api/v1/study/review/route.ts` — Prisma upsert CardProgress, create ReviewHistory
- [x] Extend `study.service.ts` with `reviewCard(userId, cardId, grade)` — SM-2 integration
- [x] Create `src/features/study/hooks/useSpacedRepetition.ts` — React Query hooks for due cards
- [x] Create SM-2 study page `src/app/(app)/study/page.tsx` — load due cards, study session
- [x] Add "X cards due today" alert component to Dashboard (placeholder, data wired in Phase 6)
- [x] **Run tests**: All SM-2 unit tests PASS, integration tests PASS
- [x] **Scenario verification**: `Scenario: First Review — GOOD grade`, `Scenario: HARD grade — Reduced Interval`, `Scenario: Ease Factor Floor`, `Scenario: Valid Review`

---

## Phase 6: Dashboard & Stats
**Objective**: Dashboard với streak, heatmap, recent sessions.
**Boundaries**: `src/app/(app)/dashboard/`, `src/app/api/v1/dashboard/`, `src/features/dashboard/`, `src/server/services/stats.service.ts`, `UserStats` table

- [x] **Write unit test**: `test_streak_maintained()`, `test_streak_broken()`, `test_streak_calculation()`
- [x] **Write integration test**: `test_dashboard_stats_response()`, `test_activity_heatmap_performance()`
- [x] Prisma migration: `pnpm prisma migrate dev --name user_stats`
- [x] Create `src/server/services/stats.service.ts` — updateStreak, getStats, getActivity
- [x] Wire streak update into `study.service.reviewCard()` — increment after successful review
- [x] Create API route handlers: `src/app/api/v1/dashboard/stats/`, `/activity/`, `/recent-sessions/`
- [x] Create Dashboard page `src/app/(app)/dashboard/page.tsx` — SSR + Suspense streaming per widget
- [x] Create StatsCards component (streak, longest streak, total reviews, cards studied, accuracy, totalSets, totalCards)
- [x] Create ActivityHeatmap component — GitHub-style 53-week grid
- [x] Create RecentSessions component
- [x] Wire DueCardsAlert with real `/api/v1/study/due-cards` count
- [x] **Run tests**: Streak tests PASS, heatmap query < 200ms verified
- [x] **Scenario verification**: `Scenario: Streak Maintained`, `Scenario: Streak Broken`, `Scenario: Stats Display — Accuracy and Counts`, `Scenario: Recent Sessions List`

---

## Phase 7: Search & Public Library
**Objective**: Full-text search, filters, Public Library (ISR).
**Boundaries**: `src/app/(app)/search/`, `src/app/(public)/library/`, `src/app/api/v1/search/`, `/library/`, `src/features/search/`, `src/features/library/`, `src/server/services/search.service.ts`

- [x] **Write integration test**: `test_search_basic_query()`, `test_search_language_filter()`, `test_search_tag_filter()`, `test_search_empty_query_400()`
- [x] **Write integration test**: `test_library_newest_sort()`, `test_library_most_studied_sort()`
- [x] Prisma migration: `pnpm prisma migrate dev --name full_text_search` — add `search_vector` column, GIN index, trigger (runtime tsvector + ILIKE fallback)
- [x] Create `src/server/services/search.service.ts` — full-text search with `$queryRaw` tsvector
- [x] Create `src/app/api/v1/search/route.ts` — query validation, `q` required, language/tag filters
- [x] Create `src/app/api/v1/library/route.ts` — sort=newest|most_studied|trending
- [x] Create Search page `src/app/(app)/search/page.tsx`
- [x] Create SearchBar, SearchResults, SearchFilters components
- [x] Create Public Library page `src/app/(public)/library/page.tsx` — `export const revalidate = 300`
- [x] Create LibraryGrid, LibraryFilters, SortTabs components
- [x] **Write integration test**: `test_library_trending_sort()` — covers trending MUST sort option
- [x] Create public Set preview page `src/app/(public)/shared/[setId]/page.tsx` — route at `/shared/[setId]` (avoids collision with `(app)/sets/[setId]`)
- [x] Wire "Duplicate to my sets" button on public set preview
- [x] **Run tests**: Search integration tests PASS
- [x] **Scenario verification**: `Scenario: Basic Search`, `Scenario: Search with Tag Filter`, `Scenario: Empty Query`, `Scenario: Newest Sort`, `Scenario: Most Studied Sort`, `Scenario: Trending Sort`, `Scenario: ISR Cache`

---

## Phase 8: Polish, Security & Performance
**Objective**: Production-ready — Lighthouse > 90, security hardened.
**Boundaries**: `next.config.ts`, `src/middleware.ts`, `src/components/shared/`, tests, performance optimizations.

- [x] Install and configure Vercel Analytics + Speed Insights (`@vercel/analytics`, `@vercel/speed-insights`)
- [ ] Add Jest coverage gate: `pnpm jest --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80}}'` (project uses Vitest)
- [x] Add CSP headers + X-Frame-Options + X-Content-Type-Options in `next.config.ts`
- [x] Apply rate limiting to all mutation API endpoints (use `apiRateLimit`)
- [x] Apply `uploadRateLimit` to `/api/v1/upload/presigned-url`
- [x] Create `src/components/shared/ErrorBoundary.tsx` + loading skeletons for all async sections
- [x] Lazy load study mode components (`dynamic(() => import(...), { ssr: false })`)
- [x] Code-split heavy components (ActivityHeatmap, TestMode)
- [ ] Run `ANALYZE=true pnpm build` → fix chunks > 100KB
- [x] Verify VirtualList used in CardList for sets with > 50 cards
- [ ] Add `loading="lazy"` + `placeholder="blur"` to all `<Image>` components (no next/image usage yet)
- [ ] Run Lighthouse audit → fix issues until score > 90 on mobile
- [x] Create `tests/unit/sm2.test.ts` full coverage (`src/features/study/lib/sm2.test.ts`)
- [x] Create `tests/e2e/` — critical flow tests (register, create set, study, SM-2 review)
- [x] Write `README.md` — setup instructions, environment variables, deploy guide
- [ ] Verify all Vercel environment variables are set correctly
- [ ] Final production deploy + smoke test

---

## Surface Documentation

- [x] **README.md**: Create with Quick Start, Environment Variables, Deploy to Vercel guide, Architecture overview link
- [x] **N/A ROADMAP.md**: Not applicable — this is a new greenfield project, no existing roadmap
- [x] **N/A DESIGN.md**: Not applicable — UI system uses shadcn/ui default design system

---

## Verification Checklist

- [x] **MUST**: SM-2 algorithm: All 6 test scenarios from `specs/spaced-repetition/spec.md` pass
- [x] **MUST**: Auth: All 6 requirements from `specs/authentication/spec.md` verified (Email Login, Registration, Google OAuth, Password Reset, Route Protection, Session Security)
- [x] **MUST**: FlashcardSet: Unauthorized Update (403), Delete Cascade tested
- [x] **MUST**: Write Mode: Fuzzy match unit tests (`test_fuzzy_match_*`) all pass with correct thresholds
- [ ] **MUST**: Performance: Lighthouse mobile score ≥ 90 on Vercel deployment
- [ ] **MUST**: Security: CSP headers present in production (verify in DevTools Network after deploy)
- [x] **MUST**: Database: Connection uses port 6543 (PgBouncer), not 5432 (direct)
- [x] **MUST**: All API endpoints return proper error format `{ error, message, details }`
- [x] **MUST**: No `process.env` direct access outside `src/lib/` or `src/server/`
- [ ] **SHOULD**: Bundle First Load JS < 100KB (gzipped) for main routes
- [x] **SHOULD**: Activity heatmap query < 200ms with 1-year of data
