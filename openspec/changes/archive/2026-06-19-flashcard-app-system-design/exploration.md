## Problem Statement

Cần một công cụ học Flashcard hiện đại, performant và tự sở hữu — không phụ thuộc vào Quizlet. Quizlet là nguồn cảm hứng về tính năng và UX, nhưng sản phẩm phải có thiết kế, codebase và thương hiệu hoàn toàn độc lập. Hệ thống cần sẵn sàng deploy production trên Vercel ngay từ ngày đầu.

## Context & Background

- Greenfield project — không có existing code.
- Quizlet là benchmark về UX: flip card, spaced repetition, multiple study modes, public library.
- Stack được chỉ định: Next.js 15 App Router, TypeScript, TailwindCSS, shadcn/ui, React Query, Zustand, Prisma ORM, Supabase (PostgreSQL + Storage), NextAuth.js (Google + Email), deploy Vercel.
- Scale: personal / side project (< 100 users ban đầu).

## Constraints

- **Deployment**: Chỉ Vercel — không dùng VPS/self-hosted infrastructure.
- **Database**: Supabase (PostgreSQL) — không dùng Neon, PlanetScale, hay MongoDB.
- **Media**: Supabase Storage — không cần separate CDN layer cho MVP.
- **Auth**: NextAuth.js (Auth.js) — Google OAuth + Email/Password.
- **No Redis / No Queue**: Scale nhỏ, không justify thêm Redis hay job queue cho MVP.
- **Performance target**: Lighthouse > 90, TTFB thấp, UX mượt trên mobile.
- **Design-first**: Không generate code cho đến khi toàn bộ 9 design artifacts được review và sign-off.

## Assumptions

- [ASSUMPTION] Không cần real-time collaboration (multi-user live editing cùng lúc).
- [ASSUMPTION] Không cần mobile native app — responsive web là đủ.
- [ASSUMPTION] Không có payment / monetization trong scope hiện tại.
- [ASSUMPTION] Supabase free tier đủ cho < 100 users (500MB DB, 1GB Storage, 2GB bandwidth/tháng).
- [ASSUMPTION] Spaced Repetition dùng thuật toán SM-2 (giống Anki) — không cần ML model riêng.
- [ASSUMPTION] Full-text search dùng PostgreSQL `tsvector` / `pg_trgm` — không cần Elasticsearch.
- [ASSUMPTION] Image optimization dùng Next.js `<Image>` component + Supabase Storage CDN.

## Scope

**8 Feature Groups đầy đủ:**

1. **Authentication**: Đăng ký, đăng nhập, Google Login, quên mật khẩu.
2. **Flashcard Sets**: Tạo/sửa/xóa/duplicate/chia sẻ set; title, description, language, visibility (Private/Public).
3. **Flashcard**: Front, Back, Image (optional), Audio (optional), Example (optional); CRUD toàn bộ.
4. **Study Modes**:
   - *Flashcard Mode*: Flip card, keyboard shortcuts, mobile swipe.
   - *Learn Mode*: Hỏi đáp, điền đáp án, chấm điểm.
   - *Write Mode*: Gõ lại đáp án, fuzzy matching.
   - *Test Mode*: Multiple choice, True/False, Typing.
5. **Spaced Repetition (SM-2)**: Ease Factor, Interval, Due Date, Review Count cho mỗi card.
6. **Dashboard**: Số set, số card đã học, streak, accuracy, daily activity.
7. **Search**: Full-text search, filter theo tag/language/topic.
8. **Public Library**: Danh sách set công khai, Trending, Most Studied, Newest.

**Design Artifacts cần thiết kế:**
1. Product Architecture
2. System Architecture
3. Database Design (ERD + Prisma Schema + Indexes)
4. API Design
5. Folder Structure (feature-based)
6. Performance Strategy
7. Security Strategy
8. Deployment Roadmap
9. Principal Engineer Architecture Review

## Non-Goals

- Real-time collaboration / multi-user live editing
- Mobile native app (iOS/Android)
- Payment / Subscription / Monetization
- Advanced analytics / ML-based recommendations
- Browser extension
- Offline-first / PWA (có thể thêm sau)
- Multi-tenancy / SaaS billing

## Success Criteria

- Tất cả 9 design artifacts được tạo đầy đủ và reviewed.
- Database schema pass Principal Engineer review (indexes hợp lý, không N+1, normalized đúng mức).
- API design nhất quán (REST conventions, error handling, pagination).
- Folder structure rõ ràng, feature-isolated, dễ onboard contributor mới.
- Performance strategy đủ để đạt Lighthouse > 90 trên Vercel.
- Security checklist đủ cho production (Zod, CSRF, rate-limit, XSS, SQL injection prevention).
- Sau sign-off → generate production-ready source code.
