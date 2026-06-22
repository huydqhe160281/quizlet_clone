# Implementation Tasks: Vercel Optimization

## Phase 1: RSC Migration
- [x] 1. **Refactor SearchPageClient**: Move the initial Prisma search query to the Server Component `SearchPage` (in `src/app/search/page.tsx` or similar), pass the result down to the Client Component as `initialData` for TanStack Query.
- [x] 2. **Refactor LibraryPageClient**: Extract the user's sets query into the Server Component and pass the data down to eliminate the client-side fetch waterfall.
- [x] 3. **Refactor DueCardsAlert**: If the DueCardsAlert is part of a server-rendered dashboard, move its data fetching to the Server Component and pass the count as a prop, eliminating the `useQuery` call entirely.

## Phase 2: Caching Implementation
- [x] 4. **Prisma Cache Wrappers**: Create utility functions in `src/server/db.ts` or `src/services/` that wrap frequent Prisma queries (like fetching public sets or search results) using `unstable_cache` or React's `cache()`. Ensure user-specific queries append the user's ID to the tags (e.g., `tags: [\`sets-\${userId}\`]`).
- [x] 5. **Route Segment Config**: Add `export const revalidate = 3600;` (or appropriate time) to read-heavy, low-frequency mutation pages to leverage ISR on Vercel.
- [x] 6. **Cache Invalidation Setup**: Update mutation API routes (`POST`, `PATCH`, `DELETE` for Sets and Cards) to call user-scoped tags like `revalidateTag(\`sets-\${userId}\`)` or `revalidatePath` ensuring stale caches are cleared efficiently without purging global data.

## Phase 3: Config Adjustments
- [x] 6. **Vercel Region Config**: Update `vercel.json` to include `"regions": ["sin1"]` (or the precise ID matching the Supabase region) to lock Serverless function execution near the database.
- [x] 7. **PgBouncer Check**: Ensure `.env.example` documents that `DATABASE_URL` must use port 6543 and `?pgbouncer=true` for Vercel deployments.
