# Basic Design Document
# Flashcard App — flashcard-app-system-design

**Version**: 1.0 | **Status**: Draft | **Date**: 2026-06-16

---

## 1. System Overview

Kiến trúc monorepo BFF (Backend For Frontend) trên Next.js 15 App Router. Không có separate backend server. Route Handlers (`/api/v1/**`) đóng vai trò REST API layer.

```
Next.js 15 App Router (Vercel)
├── Server Components (SSR + Streaming)
├── Client Components (Interactive UI)
├── Route Handlers (REST API — /api/v1/**)
└── Edge Middleware (Auth guard, rate limit)

Supabase Platform
├── PostgreSQL (via Prisma + PgBouncer)
└── Storage (image/audio buckets)
```

---

## 2. Component Design

### 2.1 Authentication Component
- **Provider**: NextAuth.js v5 (Auth.js)
- **Strategy**: JWT in httpOnly cookie
- **Providers**: Google OAuth + Credentials (email/password)
- **Session check**: Edge Middleware + `await auth()` (NextAuth v5 API) in Server Components and Route Handlers
- **Password**: bcrypt hash, rounds=12

### 2.2 Data Access Layer
- **ORM**: Prisma 5 — type-safe, parameterized queries
- **Connection**: Supabase PgBouncer (transaction mode, port 6543)
- **Pattern**: Singleton Prisma client (globalThis pattern for Next.js hot reload)
- **Services**: 6 service files under `src/server/services/` — one per domain

### 2.3 API Layer
- **Format**: REST JSON
- **Validation**: Zod on every route handler
- **Error handling**: `withErrorHandler()` wrapper — catches `ApiError`, `ZodError`, generic
- **Pagination**: Cursor-based (`?cursor=<cuid>&limit=20`)
- **Rate limiting**: LRU cache in-memory (per userId or IP)

### 2.4 Study Engine
- **SM-2**: Pure function in `src/features/study/lib/sm2.ts`
- **Grade scale**: AGAIN(0), HARD(1), GOOD(2), EASY(3)
- **Ease floor**: 1.3 minimum
- **Storage**: `CardProgress` table (upsert per userId+cardId)

### 2.5 Search Engine
- **Technology**: PostgreSQL tsvector + GIN index
- **Trigger**: Auto-update `search_vector` on title/description change
- **Query**: `plainto_tsquery` + `ts_rank` for relevance
- **Filter**: `visibility = 'PUBLIC'` or `userId = current user`

### 2.6 Media Storage
- **Provider**: Supabase Storage (bucket: `flashcard-media`)
- **Upload pattern**: Presigned URL (client uploads directly, not via Vercel)
- **Limits**: Image 5MB, Audio 10MB
- **DB storage**: Store path only (not full URL); reconstruct URL at render time

---

## 3. Data Flow Diagrams

### 3.1 Study Session Flow (SM-2)
```
User grades card
→ POST /api/v1/study/review { cardId, grade }
→ Route Handler validates input (Zod)
→ studyService.reviewCard(userId, cardId, grade)
  → Load CardProgress from DB
  → sm2.calculate(current state, grade) → new state
  → Prisma.cardProgress.upsert(new state)
  → Prisma.reviewHistory.create(review record)
  → statsService.updateStreak(userId)
→ Return { newInterval, newEaseFactor, nextDueDate }
→ React Query cache update (optimistic)
```

### 3.2 Media Upload Flow
```
User selects file
→ POST /api/v1/upload/presigned-url { fileType, fileName, mimeType }
→ Validate MIME type + size
→ supabase.storage.createSignedUploadUrl(path)
→ Return { signedUrl, path, publicUrl }
→ Client: PUT file to signedUrl (direct to Supabase)
→ Client: POST /api/v1/sets/:id/cards with { imageUrl: path }
→ DB stores path; publicUrl generated on render
```

---

## 4. Database Table Summary

| Table | Purpose | Key Indexes |
|---|---|---|
| `users` | Auth + profile | `email` unique |
| `accounts` | OAuth providers | `(provider, providerAccountId)` unique |
| `sessions` | NextAuth sessions | `sessionToken` unique |
| `flashcard_sets` | Set metadata | `userId`, `visibility`, `search_vector` GIN |
| `flashcards` | Individual cards | `(setId, sortOrder)` |
| `card_progress` | SM-2 state per card | `(userId, cardId)` unique, `(userId, dueDate)` |
| `review_history` | Review log | `(userId, reviewedAt DESC)` |
| `study_sessions` | Session records | `(userId, startedAt DESC)` |
| `session_cards` | Per-card session results | `sessionId` |
| `user_stats` | Streak + accuracy | `userId` unique |
| `tags` | Tag vocabulary | `name` unique |
| `folders` | User folders | `userId` |

---

## 5. Rendering Strategy Summary

| Route | Strategy | Cache TTL |
|---|---|---|
| `/` | SSG | ∞ |
| `/library` | ISR | 300s |
| `/dashboard` | SSR | No cache |
| `/sets/[setId]` | SSR + Streaming | No cache |
| `/study/` | CSR | No cache |
| `/sets/[setId]/flashcard` | CSR | No cache |

---

## 6. Security Controls Summary

| Threat | Control | Implementation |
|---|---|---|
| XSS | React DOM escaping + CSP headers | `next.config.ts` security headers |
| CSRF | SameSite=Lax cookies | NextAuth cookie config |
| SQL Injection | Parameterized queries | Prisma ORM |
| Auth bypass | Edge Middleware route guard | `src/middleware.ts` |
| Unauthorized access | Ownership check in every mutation | `src/server/services/**` |
| Brute force | Rate limiting per IP/user | `src/lib/rate-limit.ts` |
| Secrets leak | .env.local + .gitignore | Never commit credentials |
