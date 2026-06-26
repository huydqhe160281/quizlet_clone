# Security Strategy

## 1. Authentication & Session Security

### NextAuth.js Configuration

```typescript
// src/server/auth/auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter is for OAuth Account linking + User persistence only.
  // session.strategy = 'jwt' means sessions are NOT stored in the Session table.
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        return user;
      },
    }),
  ],
  session: {
    strategy: 'jwt',        // JWT trong httpOnly cookie
    maxAge: 30 * 24 * 60 * 60, // 30 ngày
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,     // XSS protection: JS không đọc được
        sameSite: 'lax',    // CSRF protection
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
    },
  },
});
```

### Password Hashing

```typescript
// Bcrypt cost factor 12 (balance security vs speed)
const HASH_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, HASH_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

---

## 2. Input Validation (Zod)

**Nguyên tắc**: Validate ở route handler TRƯỚC khi xử lý bất kỳ business logic nào.

```typescript
// src/features/sets/schemas/set.schema.ts
import { z } from 'zod';

export const createSetSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .trim(),
  description: z.string()
    .max(2000, 'Description too long')
    .trim()
    .optional(),
  language: z.string()
    .regex(/^[a-z]{2}$/, 'Invalid language code')
    .optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
  tagIds: z.array(z.string().cuid()).max(10).optional(),
});

export type CreateSetInput = z.infer<typeof createSetSchema>;
```

```typescript
// Route handler usage
export async function POST(req: Request) {
  const body = await req.json();

  const result = createSetSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: 'VALIDATION_ERROR', details: result.error.flatten() },
      { status: 400 }
    );
  }

  // result.data is now typed and safe
  const set = await setService.create(userId, result.data);
  return Response.json(set, { status: 201 });
}
```

---

## 3. Authorization — Permission Checks

**Nguyên tắc**: Luôn kiểm tra ownership trước mọi mutation.

```typescript
// src/server/services/sets/set.service.ts

export async function updateSet(userId: string, setId: string, data: UpdateSetInput) {
  // 1. Fetch set
  const set = await prisma.flashcardSet.findUnique({ where: { id: setId } });

  // 2. Check existence
  if (!set) throw new ApiError('NOT_FOUND', 'Set not found', 404);

  // 3. Check ownership — CRITICAL
  if (set.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'You do not own this set', 403);
  }

  // 4. Update
  return prisma.flashcardSet.update({ where: { id: setId }, data });
}
```

**Edge Middleware cho route protection:**

```typescript
// src/middleware.ts
import { auth } from '@/server/auth';

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/sets') ||
    req.nextUrl.pathname.startsWith('/study');

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 4. Rate Limiting

Dùng middleware approach với in-memory store (đủ cho personal project):

```typescript
// src/lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

const tokenCache = new LRUCache<string, number[]>({ max: 500 });

export function rateLimit({ limit, windowMs }: RateLimitOptions) {
  return function check(identifier: string): { success: boolean; remaining: number } {
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = (tokenCache.get(identifier) ?? []).filter(t => t > windowStart);
    timestamps.push(now);
    tokenCache.set(identifier, timestamps);

    const remaining = Math.max(0, limit - timestamps.length);
    return { success: timestamps.length <= limit, remaining };
  };
}

// Định nghĩa limits
export const authRateLimit = rateLimit({ limit: 5, windowMs: 60_000 });     // 5 req/min
export const apiRateLimit = rateLimit({ limit: 100, windowMs: 60_000 });     // 100 req/min
export const uploadRateLimit = rateLimit({ limit: 10, windowMs: 60_000 });   // 10 uploads/min
```

```typescript
// Usage trong route handler
export async function POST(req: Request) {
  const session = await auth();
  const { success } = authRateLimit(session?.user?.id ?? req.headers.get('x-forwarded-for') ?? 'anon');

  if (!success) {
    return Response.json(
      { error: 'RATE_LIMITED', message: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // ... handle request
}
```

---

## 5. CSRF Protection

NextAuth.js v5 dùng SameSite cookie (`sameSite: 'lax'`) → chống CSRF native mà không cần token riêng.

Với API mutations (non-NextAuth), verify Origin header:

```typescript
// src/lib/csrf.ts
export function verifyCsrf(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (!origin || !host) return false;

  const originUrl = new URL(origin);
  return originUrl.host === host;
}
```

---

## 6. XSS Prevention

Next.js/React tự động escape HTML trong JSX. Thêm Content Security Policy header:

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js cần unsafe-eval ở dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://*.supabase.co",
      "media-src 'self' https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co https://accounts.google.com",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
```

**Không dùng `dangerouslySetInnerHTML`** trừ khi bắt buộc và đã sanitize với DOMPurify.

---

## 7. SQL Injection Prevention

Prisma sử dụng parameterized queries — SQL injection không thể xảy ra qua ORM.

Nếu cần raw query (ví dụ: full-text search), luôn dùng tagged template:

```typescript
// ✅ Safe: Prisma raw với template literal
const results = await prisma.$queryRaw`
  SELECT id, title FROM flashcard_sets
  WHERE search_vector @@ plainto_tsquery('english', ${searchQuery})
    AND visibility = 'PUBLIC'
  LIMIT ${limit}
`;

// ❌ NEVER do this
const results = await prisma.$queryRawUnsafe(
  `SELECT * FROM flashcard_sets WHERE title LIKE '%${userInput}%'`
);
```

---

## 8. Supabase Storage Security

```typescript
// Bucket configuration (Supabase dashboard / migration)
// - `flashcard-media` bucket: private (chỉ signed URL)
// - File size limits: image 5MB, audio 10MB
// - Allowed MIME types: image/jpeg, image/png, image/webp, audio/mpeg, audio/wav

// Row Level Security (RLS) trên Storage objects
// Policy: user chỉ đọc được file của chính mình (hoặc public cards)
```

---

## 9. Environment Variables Security

```bash
# .env.local (NEVER commit to git)
DATABASE_URL=                    # Supabase pooled connection
DIRECT_DATABASE_URL=             # Supabase direct connection (migrations only)
NEXTAUTH_SECRET=                 # Random 32+ char secret
NEXTAUTH_URL=                    # App URL
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SUPABASE_URL=
SUPABASE_ANON_KEY=               # Public (safe in client)
SUPABASE_SERVICE_ROLE_KEY=       # PRIVATE — server only, never expose
RESEND_API_KEY=                  # Email provider
```

**`.gitignore` đảm bảo:**
```
.env
.env.local
.env.production
```

---

## 10. Security Checklist tóm tắt

| Layer | Mechanism | Status |
|---|---|---|
| Authentication | NextAuth JWT httpOnly cookie | ✅ |
| Password | Bcrypt rounds=12 | ✅ |
| Input validation | Zod mọi API input | ✅ |
| Authorization | Ownership check mọi mutation | ✅ |
| Route protection | Edge Middleware | ✅ |
| Rate limiting | LRU cache per user/IP | ✅ |
| CSRF | SameSite=lax cookie | ✅ |
| XSS | React DOM escaping + CSP header | ✅ |
| SQL Injection | Prisma parameterized queries | ✅ |
| Storage | Signed URLs, RLS | ✅ |
| Secrets | .env.local, never commit | ✅ |
| HTTPS | Vercel enforces TLS | ✅ |
