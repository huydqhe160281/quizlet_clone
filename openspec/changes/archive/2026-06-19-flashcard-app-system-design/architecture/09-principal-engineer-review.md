# Principal Engineer Architecture Review

> Review này được thực hiện từ góc nhìn của một Principal Engineer, tập trung vào Scalability, Maintainability, Performance, và Risk.

---

## 1. Điểm mạnh của kiến trúc hiện tại ✅

### 1.1 Monorepo BFF (Next.js Route Handlers)
**Nhận xét**: Đúng hướng cho personal project và small team. Tránh overhead của microservices (service discovery, network hops, distributed tracing) mà không cần thiết ở scale này. Next.js App Router là lựa chọn mature cho 2024–2025.

### 1.2 Feature-based folder structure
**Nhận xét**: Tốt hơn layer-based (controllers/, models/, services/) ở khía cạnh scalability. Khi cần tách module thành microservice sau này, ranh giới đã rõ ràng.

### 1.3 Prisma + PostgreSQL
**Nhận xét**: Prisma type-safety ngăn nhiều lỗi runtime. PostgreSQL cho full-text search qua tsvector là quyết định đúng — không cần Elasticsearch ở scale này, và tránh thêm 1 infrastructure component.

### 1.4 SM-2 là pure function
**Nhận xét**: Xuất sắc. Pure functions dễ unit test, dễ thay thế thuật toán (SM-2 → FSRS4 sau này) mà không ảnh hưởng phần còn lại. Đây là kiến trúc đúng cho business-critical logic.

### 1.5 Cursor-based pagination
**Nhận xét**: Tốt hơn offset pagination ở scale lớn (tránh unstable results khi data thay đổi giữa pages). Quyết định đúng từ ngày 0.

---

## 2. Vấn đề về Scalability ⚠️

### 2.1 Connection Pooling — CRITICAL
**Vấn đề**: Vercel serverless tạo function mới mỗi request. Nếu dùng Prisma direct connection (port 5432) mà không qua PgBouncer, PostgreSQL sẽ bị `max_connections exceeded` dù chỉ có vài chục users đồng thời.

**Giải pháp** (đã documented trong kiến trúc):
```
DATABASE_URL → Supabase Pooler (port 6543, transaction mode)
DIRECT_DATABASE_URL → Direct (chỉ cho migrations)
```

**Risk**: Nếu quên set đúng → production crash ngay khi deploy. Cần test kỹ Phase 0.

---

### 2.2 UserStats — Write Contention khi Scale
**Vấn đề**: Bảng `user_stats` được UPDATE mỗi lần user hoàn thành review. Khi user học 100 cards/session, đây là 100 UPDATE trên cùng 1 row.

**Ở scale hiện tại (< 100 users)**: Không vấn đề.

**Cải tiến cho tương lai nếu scale**:
```typescript
// Option A (immediate): Batch updates — accumulate trong session, flush 1 lần
// Option B (later): Event sourcing — ghi review events, tính stats offline
// Option C (pragmatic): Queue cuối session bằng Vercel Cron

// Hiện tại: chấp nhận 1 UPDATE per review vì scale nhỏ
```

---

### 2.3 Full-Text Search — PostgreSQL vs Dedicated Search
**Vấn đề**: PostgreSQL tsvector đủ cho < 10K sets. Nếu Public Library scale lên, GIN index có thể không đủ fast cho complex queries.

**Điều kiện upgrade**: Khi search latency > 500ms hoặc index size > 1GB.
**Migration path**: Algolia hoặc Typesense — chỉ cần sync public sets, không phải toàn bộ data.

---

### 2.4 StudySession Concurrency
**Vấn đề**: User có thể mở nhiều tab → nhiều study sessions đồng thời → race condition khi update `card_progress`.

**Giải pháp hiện tại** (đủ cho personal project):
```typescript
// Prisma upsert với unique constraint (userId, cardId)
await prisma.cardProgress.upsert({
  where: { userId_cardId: { userId, cardId } },
  create: { userId, cardId, ...sm2Result },
  update: { ...sm2Result },
});
```

**Không cần pessimistic locking** ở scale này — last-write-wins là acceptable.

---

## 3. Vấn đề về Maintainability ⚠️

### 3.1 Service Layer Coupling
**Vấn đề tiềm ẩn**: Nếu route handlers gọi Prisma trực tiếp (không qua Service layer), business logic rải rác khắp nơi — khó test, khó maintain.

**Quy tắc cứng cần enforce**:
```
Route Handler → Service → Prisma (NOT: Route Handler → Prisma directly)
```

**Lỗi phổ biến cần tránh**:
```typescript
// ❌ Logic trong route handler
export async function POST(req: Request) {
  const { title } = await req.json();
  const set = await prisma.flashcardSet.create({ data: { title, userId } }); // Direct Prisma call
  return Response.json(set);
}

// ✅ Logic trong Service
export async function POST(req: Request) {
  const { userId } = await requireAuth();
  const data = createSetSchema.parse(await req.json());
  const set = await setService.create(userId, data); // Service call
  return Response.json(set);
}
```

---

### 3.2 Zod Schema Co-location
**Nhận xét tích cực**: Đặt Zod schemas trong `features/*/schemas/` là đúng. Tuy nhiên, cần tránh drift giữa:
- Zod schema (API validation)
- Prisma schema (DB)
- TypeScript types (client)

**Giải pháp**: Generate types từ Zod (`z.infer<typeof schema>`) thay vì define riêng.

---

### 3.3 Error Handling Consistency
**Requirement**: Mọi route handler PHẢI wrap với `withErrorHandler()`. Nếu developer quên → uncaught errors leak stack trace ra client.

**Đề xuất**: Tạo `createRouteHandler()` wrapper bắt buộc:
```typescript
// Nếu không có withErrorHandler, eslint rule sẽ báo lỗi
// (custom eslint rule hoặc template trong CONTRIBUTING.md)
```

---

### 3.4 Prisma Client Singleton
**Vấn đề phổ biến với Next.js + Prisma**: Hot reload tạo nhiều Prisma client instances → memory leak.

**Giải pháp** (phải implement):
```typescript
// src/server/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## 4. Vấn đề về Performance ⚠️

### 4.1 N+1 Queries — Nguy cơ cao nhất
**Vấn đề**: Developer mới dễ viết N+1 khi fetch cards cho dashboard.

**Monitoring**: Bật Prisma query logging ở dev và review query count trước khi merge.

```typescript
// Prisma log config
new PrismaClient({ log: ['query'] }) // đếm số queries per request
```

---

### 4.2 Card Image Loading trên Set Detail
**Vấn đề**: Set 200 cards với mỗi card có image → 200 images load = tệ.

**Giải pháp**:
```tsx
// Chỉ load image của card đang visible (intersection observer)
// hoặc virtualization + lazy load
<Image loading="lazy" ... />
// CardList dùng VirtualList (react-virtual)
```

---

### 4.3 Dashboard Activity Heatmap — Query nặng
**Vấn đề**: Query review_history 365 ngày qua có thể chậm nếu user học nhiều.

**Tối ưu**:
```sql
-- Index đã có: (userId, reviewedAt DESC)
-- Query dùng DATE_TRUNC để aggregate per day
SELECT DATE_TRUNC('day', reviewed_at) as day, COUNT(*) as count
FROM review_history
WHERE user_id = $1 AND reviewed_at >= NOW() - INTERVAL '365 days'
GROUP BY day
ORDER BY day;
```

**Kết quả**: Single aggregation query, không N+1. Fast với index.

---

### 4.4 Supabase Storage — Cold Start
**Vấn đề**: Supabase Storage free tier có thể có CDN cache miss cho files không được access thường xuyên.

**Mitigation**: Tạo presigned URL với TTL ngắn (1 giờ) và cache public URL trong React Query.

---

## 5. Đề xuất Cải tiến (Ưu tiên)

### Priority 1: Implement ngay (Day 1)
| Item | Lý do |
|---|---|
| Prisma client singleton | Memory leak nghiêm trọng nếu thiếu |
| Connection pooling (port 6543) | Production crash nếu dùng port 5432 |
| `withErrorHandler` wrapper | Error leak, security risk |

### Priority 2: Trước Phase 3
| Item | Lý do |
|---|---|
| React Query `staleTime` config | Tránh over-fetching |
| VirtualList cho CardList | UX lag với set 100+ cards |
| Optimistic updates cho mutations | UX feel snappy |

### Priority 3: Trước deploy production
| Item | Lý do |
|---|---|
| Security headers (CSP) | XSS protection |
| Rate limiting mọi mutation | Abuse prevention |
| Bundle analysis (ANALYZE=true) | Lighthouse target |
| E2E tests cho critical flows | Regression prevention |

---

## 6. Quyết định Kiến trúc — ADR (Architecture Decision Records)

### ADR-001: Next.js Route Handlers thay vì Express/Fastify
**Quyết định**: Dùng Next.js API Routes
**Lý do**: Không cần separate backend process, Vercel tối ưu natively, ít moving parts
**Trade-off**: Bị lock-in vào Vercel/Node.js; khó migrate sang standalone API sau

### ADR-002: JWT session thay vì Database session
**Quyết định**: JWT (NextAuth default)
**Lý do**: Stateless → không query DB mỗi request; phù hợp serverless
**Trade-off**: Không thể revoke session ngay lập tức (phải đợi JWT expire)

### ADR-003: PostgreSQL tsvector thay vì Elasticsearch
**Quyết định**: PostgreSQL full-text search
**Lý do**: Không thêm infrastructure; đủ cho < 50K sets; zero setup
**Trade-off**: Relevance ranking kém hơn Elasticsearch; không có fuzzy tolerance native

### ADR-004: SM-2 thay vì FSRS4
**Quyết định**: SM-2 algorithm
**Lý do**: Simpler, battle-tested, Anki dùng; FSRS4 complex hơn cần không
**Trade-off**: FSRS4 có prediction accuracy tốt hơn SM-2 về mặt nghiên cứu

### ADR-005: Supabase Storage thay vì Cloudinary
**Quyết định**: Supabase Storage
**Lý do**: Tích hợp sẵn với Supabase; không thêm service; free tier đủ
**Trade-off**: Thiếu auto image optimization/transform của Cloudinary; giải quyết qua Next.js Image

---

## 7. Kết luận

**Verdict: APPROVED với Priority 1 fixes bắt buộc trước khi code**

Kiến trúc tổng thể **phù hợp và solid** cho scope và scale đã định. Các quyết định công nghệ hợp lý. Các risk chính đã được identify và có mitigation path rõ ràng.

**Yêu cầu trước khi generate code:**
1. ✅ Prisma singleton pattern
2. ✅ Connection pooling config documented
3. ✅ `withErrorHandler` wrapper template
4. ✅ SM-2 unit test spec
5. ✅ Security headers config

**Sau khi hoàn thiện thiết kế, chạy `/opsx-verify-spec` để auto-review specs trước khi implement.**
