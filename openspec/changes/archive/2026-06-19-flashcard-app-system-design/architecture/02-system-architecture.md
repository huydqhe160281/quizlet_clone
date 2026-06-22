# System Architecture

## 1. Kiến trúc phù hợp cho Vercel

### Lý do chọn Next.js App Router làm BFF (Backend For Frontend)

Vercel được tối ưu hoàn toàn cho Next.js. Thay vì tách frontend và backend riêng biệt (SPA + Express API), ta dùng Next.js Route Handlers làm API layer. Lý do:

- **Zero cold start** cho Route Handlers khi deploy trên Vercel (function bundling tối ưu).
- **Edge Middleware** chạy gần user nhất (Vercel Edge Network) để kiểm tra auth mà không tốn round-trip về origin.
- **Server Components** loại bỏ JavaScript client-side không cần thiết, giảm bundle size.
- **Streaming** (React Suspense) cho phép load dữ liệu progressive, tránh waterfall.

### Deployment Architecture trên Vercel

```
┌─────────────────────────────────────────────────────────┐
│                    VERCEL PLATFORM                       │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              EDGE NETWORK (CDN)                   │  │
│  │  - Static assets (JS, CSS, Images)                │  │
│  │  - Edge Middleware (auth guard, rate limit header) │  │
│  │  - Cached SSR pages (revalidate strategy)         │  │
│  └──────────────────────────┬────────────────────────┘  │
│                             │                            │
│  ┌──────────────────────────▼────────────────────────┐  │
│  │           SERVERLESS FUNCTIONS (Node.js)          │  │
│  │  - Next.js Route Handlers (/api/v1/**)            │  │
│  │  - SSR pages (dynamic routes)                     │  │
│  │  - NextAuth endpoints                             │  │
│  └──────────────────────────┬────────────────────────┘  │
└─────────────────────────────┼────────────────────────────┘
                              │ TCP (Prisma connection pooling)
┌─────────────────────────────▼────────────────────────────┐
│                    SUPABASE PLATFORM                     │
│  ┌─────────────────────┐  ┌────────────────────────────┐ │
│  │  PostgreSQL DB      │  │  Supabase Storage          │ │
│  │  (Connection Pool:  │  │  (image/audio buckets)     │ │
│  │   PgBouncer)        │  │                            │ │
│  └─────────────────────┘  └────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## 2. Request Lifecycle

### 2.1 Server-Side Rendered Page (e.g., /sets/[setId])

```
Browser Request
    │
    ▼
Vercel Edge Middleware
    │─── Check session cookie (NextAuth JWT)
    │─── If unauthenticated → redirect /login
    │─── If authenticated → forward to origin
    │
    ▼
Next.js Server Component (RSC)
    │─── Parallel data fetching (qua Service layer, không gọi Prisma trực tiếp):
    │    ├── setService.getSet(setId)        → Prisma query
    │    ├── cardService.getCards(setId)     → Prisma query
    │    └── studyService.getUserProgress()  → Prisma query
    │─── Render HTML on server
    │─── Stream HTML to browser (React Suspense boundaries)
    │
    ▼
Browser receives HTML (first byte fast)
    │─── Hydrate interactive islands (Client Components)
    └─── React Query prefetch (from RSC cache → client cache)
```

### 2.2 API Route Handler (e.g., POST /api/v1/cards)

```
Client HTTP Request
    │
    ▼
Route Handler (app/api/v1/cards/route.ts)
    │─── 1. Parse request body
    │─── 2. Zod validation
    │─── 3. Auth check (await auth())
    │─── 4. Permission check (ownership)
    │─── 5. Business logic (Service layer)
    │─── 6. Prisma DB operation
    │─── 7. Return Response (JSON)
    │
    ▼
Client receives response
    └─── React Query cache invalidation / optimistic update
```

## 3. Rendering Strategy

| Route | Strategy | Lý do |
|---|---|---|
| `/` (Landing) | SSG (Static) | Không có data user-specific, cache vĩnh viễn |
| `/library` | ISR (revalidate: 300s) | Public data, cập nhật mỗi 5 phút |
| `/sets/[setId]` | SSR + Streaming | Cần auth, data dynamic, stream cards |
| `/dashboard` | SSR | Cần session user, không cache |
| `/study/[mode]` | CSR (Client Component) | Interactive heavily, real-time state |
| `/api/v1/**` | Edge/Serverless | API endpoints |

## 4. Caching Strategy

```
┌─────────────────────────────────────────────────────┐
│                   CACHING LAYERS                    │
│                                                     │
│  L1: Browser Cache (React Query)                   │
│      staleTime: 5 phút cho set list                │
│      staleTime: 0 cho study sessions (always fresh) │
│                                                     │
│  L2: Next.js Server Cache (fetch cache)            │
│      Public library: revalidate 300s               │
│      User-specific data: no-store                  │
│                                                     │
│  L3: Vercel CDN                                    │
│      Static assets: immutable (hash-based)         │
│      ISR pages: stale-while-revalidate             │
│                                                     │
│  L4: Supabase Connection Pooling (PgBouncer)       │
│      Prisma accelerate / connection pool           │
└─────────────────────────────────────────────────────┘
```

## 5. Connection Pooling (Critical for Serverless)

Serverless functions tạo cold start mới mỗi request → không thể giữ persistent DB connection như traditional server. Giải pháp:

```
Prisma + Supabase Pooler (port 6543 - Transaction mode)
  ├── Mỗi serverless function kết nối PgBouncer
  ├── PgBouncer pool kết nối tới PostgreSQL
  └── Tránh "too many connections" error
```

**Prisma schema datasource:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // Pooled (cho runtime, port 6543 PgBouncer)
  directUrl = env("DIRECT_DATABASE_URL") // Direct (cho migrations, port 5432)
}
```

## 6. Authentication Flow (NextAuth.js v5)

```
┌─────────────────────────────────────────────────────┐
│ AUTHENTICATION FLOW                                 │
│                                                     │
│  Option A: Google OAuth                             │
│  User → /login → Google Consent → Callback         │
│       → JWT session cookie (httpOnly, secure)       │
│                                                     │
│  Option B: Email/Password                           │
│  Register: POST /api/v1/auth/register (custom)      │
│  Login: POST /api/auth/[...nextauth] (credentials)  │
│       → bcrypt verify → JWT session cookie          │
│                                                     │
│  Session storage: JWT in httpOnly cookie            │
│  Session check: Edge Middleware + await auth()      │
│                                                     │
│  Password reset flow:                               │
│  POST /api/v1/auth/forgot-password                  │
│       → Generate token → Email (Resend/Nodemailer)  │
│       → /reset-password?token=xxx                   │
│       → Validate token → UPDATE user password       │
└─────────────────────────────────────────────────────┘
```

## 7. Media Upload Flow (Supabase Storage)

```
Client chọn file (image/audio)
    │
    ▼
POST /api/v1/upload/presigned-url
    │─── Auth check
    │─── Validate file type (image/*, audio/*)
    │─── Validate file size (max: image 5MB, audio 10MB)
    │─── Supabase Storage: createSignedUploadUrl()
    │─── Return { signedUrl, path }
    │
    ▼
Client PUT file trực tiếp lên Supabase Storage (presigned URL)
    │─── Browser → Supabase (không qua Vercel serverless)
    │─── Tiết kiệm bandwidth Vercel
    │
    ▼
Client POST /api/v1/cards (với storage path)
    │─── Lưu path vào Prisma (không lưu full URL)
    └─── Full URL = getPublicUrl(path) khi render
```
