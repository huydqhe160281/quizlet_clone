# Design Brief: Vercel Free Tier Optimization

## 1. Overview
The current Quizlet Clone application suffers from excessive latency on the Vercel Free tier. The primary causes are unoptimized client-server waterfalls (heavy `useQuery` usage fetching from API routes), missing Next.js caching layers, and potential database connection/cold-start issues. This design brief outlines the architectural shifts required to achieve near-instant initial page loads and reduced API execution times.

## 2. Proposed Architecture & Optimizations

### 2.1 Next.js 15 Caching Architecture
- **Objective**: Prevent redundant database queries for static or slowly-changing data (e.g., Library sets, Search results).
- **Implementation**:
  - Implement `unstable_cache` or the new `cache()` function from React to memoize heavy database queries at the Prisma layer.
  - Apply route segment config (`export const revalidate = 3600`) where applicable to serve statically generated pages on the Edge.

### 2.2 Shift to React Server Components (RSC)
- **Objective**: Eliminate the "Client Waterfall" (Download JS -> Hydrate -> Fetch API -> DB Query).
- **Implementation**:
  - Refactor `SearchPageClient`, `LibraryPageClient`, and `DueCardsAlert` to fetch their initial data on the Server using direct `await prisma` calls inside the Server Component.
  - Pass the fetched data as `initialData` to TanStack Query for subsequent client-side interactivity, or remove TanStack Query entirely for purely read-only views.

### 2.3 Database Connection Pooling
- **Objective**: Mitigate Prisma cold starts and connection exhaustion in Vercel Serverless Functions.
- **Implementation**:
  - Ensure the `DATABASE_URL` continues to use the port `6543` and `?pgbouncer=true` suffix.
  - (Optional) Investigate upgrading to `@prisma/adapter-pg` or Prisma Edge clients if cold starts remain a severe issue, though standard PgBouncer connection pooling should suffice if serverless execution times are brought down by RSC.

### 2.4 Deployment Configuration
- **Objective**: Eliminate cross-region network latency between Vercel and Supabase.
- **Implementation**:
  - Add the `regions` array to `vercel.json` (e.g., `"regions": ["sin1"]` or matching the Supabase region) to guarantee that Serverless functions execute in the same geographical region as the database.

## 3. Impact Analysis
- **Performance**: Time to First Byte (TTFB) and Largest Contentful Paint (LCP) will drastically decrease. API execution times will stay well under the 10s timeout limit.
- **Complexity**: Mild increase in component complexity due to RSC hydration passing `initialData`.
- **Breaking Changes**: None to the user interface. Changes are strictly confined to data-fetching lifecycles.

## 4. Phase Plan Recommendation
This optimization is highly modular and should be implemented in phases:
- **Phase 1**: RSC Migration (Moving `useQuery` calls to Server Components).
- **Phase 2**: Caching Implementation (Adding Next.js Cache & Revalidation).
- **Phase 3**: Config Adjustments (`vercel.json` and DB pooling validation).
