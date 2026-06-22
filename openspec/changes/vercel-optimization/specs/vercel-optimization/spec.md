---
name: vercel-optimization
description: Specifications for optimizing performance and caching on Vercel Free Tier.
version: 1.0.0
---

# Vercel Optimization Specifications

### Requirement: React Server Components Migration
The system SHALL prioritize React Server Components (RSC) for data fetching to minimize client-side round-trips.
**Constraint**: MUST
**Verification**: Verify that `useQuery` is removed or decoupled from initial data loading in heavily trafficked Client Components.

#### Scenario: Server-side Data Fetching
- **GIVEN** a user navigates to the Library or Search pages
- **WHEN** the page is requested
- **THEN** the Next.js server executes Prisma queries directly and streams the HTML/JSON down, without triggering a secondary `fetch` from the client on mount.

---

### Requirement: Next.js Prisma Caching
The system SHALL cache expensive database operations (e.g., search results, public sets) using Next.js caching primitives (`unstable_cache` or `cache`).
**Constraint**: MUST

#### Scenario: Cached API Responses
- **GIVEN** a heavy Prisma query for popular sets
- **WHEN** multiple users request the data within the revalidation window
- **THEN** the cached response is served directly from the Edge/Server cache.

---

### Requirement: Cache Invalidation on Mutation
The system SHALL invalidate cached data automatically when the underlying database records are mutated (Created, Updated, Deleted).
**Constraint**: MUST

#### Scenario: Revalidate on Update
- **GIVEN** a user creates a new flashcard set
- **WHEN** the POST API route successfully inserts the record
- **THEN** the API calls `revalidateTag(\`sets-\${userId}\`)` or `revalidatePath(...)` to instantly clear only that user's cache, leaving other users' caches intact.

---

### Requirement: User-Specific Cache Safety
The system SHALL strictly isolate user-authenticated cached data to prevent cross-user data leakage.
**Constraint**: MUST

#### Scenario: Authenticated Data Caching
- **GIVEN** a query fetching private user data via `unstable_cache`
- **WHEN** the cache key is generated
- **THEN** the `userId` MUST be explicitly included in both the `keyParts` and `tags` (e.g., `['user-sets', userId]`).

---

### Requirement: Region Alignment
The system SHALL explicitly deploy Serverless functions to the exact region where the Supabase database is hosted to prevent cross-region latency.
**Constraint**: MUST

#### Scenario: Vercel Region Config
- **GIVEN** the deployment process
- **WHEN** Vercel builds and deploys the application
- **THEN** the `regions` attribute in `vercel.json` forces execution in the specified geographical region.
