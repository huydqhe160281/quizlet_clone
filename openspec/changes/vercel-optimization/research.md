# Research: Vercel Free Tier Optimization

## 1. Current Architecture Findings

### 1.1 Data Fetching Strategy
- **[CODEBASE]** The application heavily uses `useQuery` from `@tanstack/react-query` inside Client Components (`SearchPageClient.tsx`, `LibraryPageClient.tsx`, `DueCardsAlert.tsx`, etc.).
- **[INFERENCE]** This creates a severe Client-Side Waterfall: Browser downloads HTML $\to$ parses JS bundle $\to$ React Hydrates $\to$ Client fires `fetch` to `/api/...` $\to$ Vercel Serverless cold-starts $\to$ DB connection $\to$ Returns JSON $\to$ UI Renders. This can easily take 2-4 seconds on a free tier.
- **[CODEBASE]** Next.js 15 caching primitives (`unstable_cache`, `revalidateTag`, `cache`) are entirely absent from `src/` (0 results found in `grep`).

### 1.2 Database Connections
- **[CODEBASE]** `PrismaClient` is instantiated globally in `src/server/db.ts` using the standard `new PrismaClient()` approach.
- **[CODEBASE]** All `await prisma` calls happen inside `app/api/.../route.ts` API Handlers.
- **[INFERENCE]** Next.js 15 App Router strongly encourages moving these Prisma calls directly into Server Components (RSC). By bypassing API routes, we eliminate the HTTP overhead and enable HTML streaming.

### 1.3 Vercel & Deployment Configurations
- **[CODEBASE]** `vercel.json` does not explicitly set the deployment region (`regions` key). If Supabase is in Singapore (`ap-southeast-1`) but Vercel defaults to Washington D.C. (`iad1`), every API call suffers a cross-continental latency penalty.
- **[CODEBASE]** `next.config.ts` is well-configured for Image optimization (AVIF/WebP) and includes `@next/bundle-analyzer`, which is a good baseline.

## 2. Recommended Skills
- `system-design`: To formulate the caching layers and API route reduction.
- `safe-refactor`: For moving Client Component `useQuery` calls to Server Components safely.

## 3. Conclusions for Synthesis
The primary bottlenecks are not the code complexity, but the **Data Fetching Architecture** and **Deployment Topology**.
1. **Move to Server Components**: We must migrate data fetching out of `useQuery` and into RSCs using `Suspense` and `await prisma` directly where possible.
2. **Implement Next.js Caching**: Wrap heavy database queries in React `cache()` and Next.js `unstable_cache()` with time-based (`revalidate: 3600`) or tag-based invalidation.
3. **Region Alignment**: Explicitly configure `vercel.json` to match the Vercel function region with the Supabase database region.
