# System Design Brief: flashcard-app-system-design

## 1. Problem Statement

Người học thiếu một công cụ học Flashcard hiện đại, tự chủ, và tối ưu hiệu năng để ghi nhớ kiến thức dài hạn. Quizlet là lựa chọn phổ biến nhưng có giới hạn về tùy chỉnh, tốc độ, và không thể self-host. Mục tiêu là xây dựng một ứng dụng Flashcard production-ready lấy cảm hứng từ Quizlet, hoàn toàn độc lập về code/thương hiệu, tối ưu hơn về performance và UX, và có thể deploy ngay trên Vercel.

## 2. Strategic Goals

1. **UX-first**: Trải nghiệm flip card mượt mà, keyboard shortcut, swipe gesture trên mobile — không thua Quizlet.
2. **Spaced Repetition**: Tích hợp thuật toán SM-2 (giống Anki) để tối ưu hiệu quả ghi nhớ.
3. **Multi-mode Study**: Hỗ trợ 4 chế độ học (Flashcard / Learn / Write / Test) đa dạng nhu cầu.
4. **Performance**: Lighthouse score > 90, TTFB thấp, mượt trên mobile — nhờ SSR, Streaming, Server Components.
5. **Production-ready**: Bảo mật đầy đủ (Zod, CSRF, rate-limit), deploy Vercel, scale-ready ngay từ đầu.
6. **Open ecosystem**: Public Library cho phép chia sẻ và khám phá bộ học của cộng đồng.

## 3. Scope Boundaries

**In Scope:**
- Authentication: Email/Password + Google OAuth (NextAuth.js)
- FlashcardSet CRUD: tạo/sửa/xóa/duplicate/chia sẻ, visibility Public/Private
- Flashcard CRUD: Front, Back, Image (optional), Audio (optional), Example (optional)
- Study Modes: Flashcard Mode, Learn Mode, Write Mode, Test Mode
- Spaced Repetition: SM-2 algorithm (Ease Factor, Interval, Due Date, Review Count)
- Dashboard: streak, accuracy, daily activity, set/card counts
- Search: full-text search + filter (tag, language, topic)
- Public Library: trending, most studied, newest
- Media upload: Supabase Storage (image + audio per card)
- Deployment: Vercel (serverless functions + Edge)

**Out of Scope:**
- Real-time multi-user collaboration
- Native mobile app (iOS/Android)
- Payment / Subscription / Monetization
- Advanced ML-based recommendations
- Offline-first / Service Worker / PWA
- Browser extension
- Multi-tenancy / White-label SaaS

## 4. Non-Functional Requirements (NFRs)

- **Performance**: Lighthouse > 90 (mobile + desktop); TTFB < 200ms cho trang chính; LCP < 2.5s.
- **Scalability**: Personal project (< 100 users ban đầu); architecture cho phép scale tới 10K users mà không refactor lại core.
- **Security**: Zod validation mọi input; rate limiting (Upstash hoặc middleware); CSRF protection via NextAuth; XSS prevention qua React DOM escaping + CSP headers; SQL injection prevention qua Prisma parameterized queries; row-level permission checks.
- **Maintainability**: Feature-based folder structure; TypeScript strict mode; > 80% code coverage cho business logic; ESLint + Prettier enforced.
- **Reliability**: Graceful error handling; optimistic updates với rollback; no data loss trên network failure.
- **Observability**: Vercel Analytics + Speed Insights tích hợp sẵn.

## 5. Technology Stack & Archetype

- **Archetype**: Full-stack monorepo — Next.js App Router với Route Handlers làm BFF (Backend For Frontend); không có separate backend service.
- **Language**: TypeScript (strict mode)
- **Frontend Framework**: Next.js 15 (App Router, React 19 Server Components + Client Components)
- **UI**: TailwindCSS + shadcn/ui (Radix UI primitives)
- **State Management**: Zustand (client state) + TanStack Query / React Query (server state + caching)
- **ORM**: Prisma 5 (type-safe DB access)
- **Database**: PostgreSQL via Supabase (managed, free tier đủ cho < 100 users)
- **Storage**: Supabase Storage (image + audio per flashcard)
- **Auth**: NextAuth.js v5 (Auth.js) — Google Provider + Credentials Provider
- **Validation**: Zod (schema validation cho mọi API input)
- **Deployment**: Vercel (serverless + Edge Middleware)
- **Monitoring**: Vercel Analytics + Speed Insights
