# Design Brief: flashcard-app-system-design

<!--
  Metadata: version 1.0, status: Draft
  Input Context: architecture/**/*.md, decomposition.md, exploration.md
-->

## Context

Xây dựng ứng dụng học Flashcard production-ready từ greenfield, lấy cảm hứng từ Quizlet nhưng hoàn toàn độc lập. Stack: Next.js 15 App Router + TypeScript + Prisma + Supabase + NextAuth + Vercel.

**Tại sao bây giờ?** Đây là greenfield project — không có technical debt. Thời điểm tốt nhất để áp dụng kiến trúc đúng từ đầu thay vì refactor sau.

**Impact**: Toàn bộ hệ thống từ zero — 8 feature groups, ~30 API endpoints, ~50 files.

## Goals / Non-Goals

- **Goal**: Deploy production-ready Flashcard app lên Vercel với đủ 8 feature groups trong 30 ngày
- **Goal**: Lighthouse > 90 từ ngày deploy
- **Goal**: Security-first: Zod + rate limit + CSRF + CSP ngay từ Phase 1
- **Goal**: SM-2 spaced repetition algorithm tích hợp sâu, miễn phí (không paywall)
- **Non-Goal**: Real-time collaboration, mobile native app, monetization
- **Non-Goal**: Microservices — monorepo BFF là đủ cho personal scale

---

## Decision Log

### Decision 1: Next.js App Router làm BFF thay vì tách Frontend + Backend riêng

**WHAT**: Dùng Next.js 15 App Router với Route Handlers (`/api/v1/**`) làm API layer. Không có separate Express/Fastify server.

**WHY**: Vercel tối ưu hoàn toàn cho Next.js — zero cold start cho Route Handlers, Edge Middleware native. Server Components loại bỏ client JS không cần thiết. Một codebase duy nhất = ít overhead hơn cho solo/small team.

**REJECTED**:
- *Express.js + Next.js frontend*: Cần 2 Vercel projects, CORS setup, separate deployments. Over-engineering cho scale này.
- *tRPC*: Type-safe nhưng thêm learning curve, lock-in. REST đơn giản hơn và dễ debug hơn với existing team.

---

### Decision 2: Supabase làm Database + Storage provider

**WHAT**: Sử dụng Supabase PostgreSQL (với PgBouncer pooling) cho DB và Supabase Storage cho media (image/audio per card).

**WHY**: PostgreSQL là database tốt nhất cho structured data + full-text search. Supabase bundle cả DB + Storage + Auth foundations. Free tier đủ cho personal project. Không cần separate CDN setup — Supabase Storage có CDN edge nodes.

**REJECTED**:
- *Neon*: Serverless PostgreSQL tốt hơn cho edge, nhưng thiếu integrated Storage. Cần thêm Cloudinary/S3.
- *PlanetScale*: MySQL-based, không có native full-text search như PostgreSQL tsvector.

---

### Decision 3: SM-2 thuần (không FSRS4)

**WHAT**: Implement thuật toán SM-2 (SuperMemo 2) trong `src/features/study/lib/sm2.ts` như pure function. Grade mapping: AGAIN=0, HARD=1, GOOD=2, EASY=3.

**WHY**: SM-2 là thuật toán battle-tested (Anki dùng variant SM-2). Đơn giản hơn FSRS4 đáng kể, dễ unit test, dễ debug. Accuracy đủ tốt cho spaced repetition personal use.

**REJECTED**:
- *FSRS4 (Free Spaced Repetition Scheduler 4)*: Accuracy tốt hơn về mặt nghiên cứu nhưng phức tạp hơn nhiều (cần parameter optimization per user). Có thể migrate sau khi MVP stable.
- *Simple interval doubling*: Quá primitive, không adapt được theo performance của user.

---

### Decision 4: JWT Session thay vì Database Session

**WHAT**: NextAuth.js dùng JWT strategy — session lưu trong httpOnly cookie, không query DB mỗi request.

**WHY**: Stateless JWT phù hợp với serverless architecture. Mỗi Vercel function không cần DB roundtrip chỉ để verify session. Giảm latency và DB load.

**REJECTED**:
- *Database session (NextAuth Prisma Adapter)*: Cần query `sessions` table mỗi request — thêm DB roundtrip. Overhead không cần thiết cho personal project.
- *Paseto token*: More secure than JWT nhưng NextAuth không support natively, cần custom implementation.

---

### Decision 5: PostgreSQL tsvector cho Full-Text Search

**WHAT**: Dùng PostgreSQL native `tsvector` + GIN index + `plainto_tsquery` cho search. Tự động update qua trigger khi title/description thay đổi.

**WHY**: Không cần thêm infrastructure (Elasticsearch, Algolia, Typesense). PostgreSQL full-text search đủ mạnh cho < 50K sets. Zero additional cost.

**REJECTED**:
- *Algolia*: Excellent search quality + fuzzy matching nhưng freemium với limits. Thêm dependency và cost khi scale.
- *pg_trgm (trigram)*: Tốt cho fuzzy search nhưng slower hơn tsvector cho whole-word queries. Có thể dùng kết hợp sau.

---

### Decision 6: Cursor-based Pagination thay vì Offset

**WHAT**: Tất cả paginated endpoints dùng cursor (`?cursor=<id>&limit=20`) thay vì `?page=1&limit=20`.

**WHY**: Offset pagination có vấn đề khi data thay đổi giữa 2 page requests (phantom rows, duplicates). Cursor-based stable và performant hơn với B-tree index scan.

**REJECTED**:
- *Offset pagination*: Simpler implement nhưng `OFFSET 1000` = scan 1000 rows bỏ đi = chậm ở large datasets. Unstable khi insert/delete xảy ra.

---

### Decision 7: Presigned URL cho Media Upload (bypass Vercel)

**WHAT**: Client request presigned URL từ `/api/v1/upload/presigned-url`, sau đó PUT file trực tiếp lên Supabase Storage — không đi qua Vercel serverless.

**WHY**: Vercel serverless có response size limit (4.5MB) và bandwidth cost. Upload trực tiếp lên Supabase Storage tiết kiệm bandwidth và nhanh hơn. Chỉ lưu Storage path trong DB, không lưu full URL.

**REJECTED**:
- *Upload qua Vercel route handler*: Bị giới hạn 4.5MB response, tốn Vercel bandwidth quota, thêm latency.
- *Upload trực tiếp từ client (Supabase client SDK)*: Cần expose Supabase Service Role Key hoặc cần RLS phức tạp. Security risk.

---

### Decision 8: Virtualization cho Card List (react-virtual)

**WHAT**: Dùng `@tanstack/react-virtual` cho CardList component khi set có > 50 cards.

**WHY**: DOM node creation cho 500 cards = lag visible. Virtualization chỉ render visible items + overscan buffer. UX cải thiện dramatically.

**REJECTED**:
- *react-window*: Older API, ít maintained hơn @tanstack/react-virtual.
- *No virtualization*: Acceptable cho < 50 cards nhưng degraded UX cho heavy users.

---

## NFR Checklist

| NFR | Mechanism | Target |
|---|---|---|
| Performance | SSR + Streaming + React Query prefetch + ISR | Lighthouse > 90 |
| Scalability | Connection pooling (PgBouncer) + cursor pagination | Scale tới 10K users không refactor |
| Security | Zod + NextAuth + CSRF + CSP + rate limit | OWASP Top 10 covered |
| Maintainability | Feature-based structure + Service layer + TypeScript strict | Onboard trong 1 ngày |
| Reliability | Optimistic updates + rollback + error boundaries | No data loss |

---

## Risks / Trade-offs

- **Connection pooling misconfiguration**: Nếu `DATABASE_URL` trỏ tới port 5432 thay vì 6543 → production crash với `max_connections exceeded`.
  → **Mitigation**: Vercel env validation script trong Phase 1. Document rõ trong README.

- **JWT session không revocable ngay lập tức**: Nếu user bị compromise, JWT vẫn valid đến khi expire (30 ngày).
  → **Mitigation**: Short-lived JWT (30 phút) + refresh token; hoặc chấp nhận trade-off cho personal project.

- **SM-2 grade subjectivity**: User tự chấm "Easy/Good/Hard/Again" — không objective như test mode.
  → **Mitigation**: Test Mode (objective) tích hợp vào SM-2 schedule sau Phase 4.

- **Supabase free tier limits**: 500MB DB, 1GB Storage, 2GB bandwidth/tháng.
  → **Mitigation**: Monitor Supabase dashboard. Free tier dư dả cho < 100 users. Upgrade $25/tháng khi cần.

- **Vercel cold start**: Ít xảy ra với Vercel Pro nhưng free tier có thể có 0-second warm window.
  → **Mitigation**: Vercel Edge Middleware luôn warm (không serverless). Route Handlers có cold start nhỏ (~100ms).

---

## Documentation Impact Analysis

**Files to be CREATED** (toàn bộ greenfield):

```
src/
├── app/ (~40 files — pages + route handlers)
├── features/ (~80 files — components, hooks, schemas)
├── server/services/ (~6 service files)
├── lib/ (~8 utility files)
├── stores/ (~2 Zustand stores)
└── types/ (~3 type files)

prisma/
├── schema.prisma
└── migrations/ (~6 migration folders)

tests/
├── unit/sm2.test.ts
└── e2e/ (~5 test files)
```

**Files to be UPDATED** (config files):
- `next.config.ts` — security headers, image config
- `package.json` — dependencies
- `tailwind.config.ts` — theme config
- `.env.local` — environment variables

---

## Migration Plan

1. **Phase 1**: `pnpm prisma migrate dev --name init` → User, Account, Session, VerificationToken tables
2. **Phase 3**: `pnpm prisma migrate dev --name sets_cards` → FlashcardSet, Flashcard, Tag, SetTag, Folder, FolderSet
3. **Phase 4**: `pnpm prisma migrate dev --name study_sessions` → StudySession, SessionCard
4. **Phase 5**: `pnpm prisma migrate dev --name spaced_repetition` → CardProgress, ReviewHistory
5. **Phase 6**: `pnpm prisma migrate dev --name user_stats` → UserStats
6. **Phase 7**: `pnpm prisma migrate dev --name full_text_search` → search_vector column, GIN index, trigger function

**Production migration** (trong Vercel build command):
```bash
pnpm prisma migrate deploy && pnpm build
```

**Rollback policy**: Mỗi migration chỉ thêm (không drop, không rename) → forward-only, không cần rollback script.
