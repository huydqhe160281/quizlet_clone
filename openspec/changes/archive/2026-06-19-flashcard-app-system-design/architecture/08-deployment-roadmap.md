# Deployment Roadmap

## Phase 0: Foundation (Ngày 1–2)

**Mục tiêu**: Project setup hoàn chỉnh, CI/CD sẵn sàng, deploy empty app lên Vercel.

```
Tasks:
├── [ ] Khởi tạo Next.js 15 project (pnpm create next-app)
├── [ ] Setup TypeScript strict mode
├── [ ] Install & configure TailwindCSS + shadcn/ui
├── [ ] Setup Prisma + Supabase connection
├── [ ] Configure .env.local
├── [ ] Deploy lên Vercel (empty app) — verify deployment pipeline
├── [ ] Setup GitHub repo + branch protection (main)
└── [ ] Add Vercel Analytics + Speed Insights
```

**Vercel Setup:**
```bash
# CLI deploy
pnpm install -g vercel
vercel login
vercel link
vercel env pull .env.local   # pull env vars từ Vercel dashboard
```

**Vercel Environment Variables cần set:**
```
DATABASE_URL          → Settings > Environment Variables
DIRECT_DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL          → https://your-app.vercel.app
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## Phase 1: Core Infrastructure (Ngày 3–5)

**Mục tiêu**: Auth hoàn chỉnh, database schema, base layout.

```
Tasks:
├── [ ] Prisma schema + initial migration
│   ├── pnpm prisma migrate dev --name init
│   └── pnpm prisma generate
├── [ ] NextAuth.js setup (Google + Credentials)
├── [ ] Protected routes (Edge Middleware)
├── [ ] App layout (sidebar, navbar, mobile nav)
├── [ ] shadcn/ui components setup (button, input, card, dialog, ...)
├── [ ] React Query provider + Zustand store setup
├── [ ] Login page + Register page
└── [ ] Google OAuth test end-to-end
```

**Supabase setup:**
```sql
-- Chạy trong Supabase SQL Editor
-- 1. Tạo storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('flashcard-media', 'flashcard-media', false);

-- 2. RLS policies (xem security strategy)
```

---

## Phase 2: FlashcardSet & Cards (Ngày 6–10)

**Mục tiêu**: CRUD đầy đủ cho Sets và Cards, UI hoàn chỉnh.

```
Tasks:
├── [ ] FlashcardSet API (GET, POST, PATCH, DELETE, duplicate)
├── [ ] Sets list page (SSR + React Query)
├── [ ] Create set form + validation
├── [ ] Set detail page (SSR + Streaming)
├── [ ] Card editor (inline edit, drag & drop reorder)
├── [ ] Media upload (image + audio — Supabase Storage presigned URL)
├── [ ] Tag management
├── [ ] Folder management
└── [ ] Optimistic updates (toggle visibility, edit inline)
```

**Database migrations:**
```bash
# Sau khi cập nhật schema
pnpm prisma migrate dev --name add_full_text_search

# Deploy migrations lên Supabase production
pnpm prisma migrate deploy
```

---

## Phase 3: Study Modes (Ngày 11–17)

**Mục tiêu**: 4 study modes hoạt động với UX mượt.

```
Tasks:
├── [ ] Flashcard Mode
│   ├── 3D flip animation (CSS + Framer Motion)
│   ├── Keyboard shortcuts (Space: flip, →: next, ←: prev)
│   └── Mobile swipe (Swiper.js hoặc native touch)
├── [ ] Learn Mode (Q&A + scoring)
├── [ ] Write Mode (typing + fuzzy matching)
├── [ ] Test Mode (multiple choice + true/false + typing)
├── [ ] Study session API (create, update, complete)
└── [ ] Session result screen
```

**Fuzzy matching cho Write Mode:**
```typescript
// src/lib/utils/fuzzy.ts — Levenshtein distance based
export function isFuzzyMatch(input: string, target: string, threshold = 0.85): boolean {
  const normalized = (s: string) => s.toLowerCase().trim();
  const similarity = jaroWinklerSimilarity(normalized(input), normalized(target));
  return similarity >= threshold;
}
```

---

## Phase 4: Spaced Repetition (Ngày 18–20)

**Mục tiêu**: SM-2 algorithm tích hợp hoàn chỉnh.

```
Tasks:
├── [ ] SM-2 pure function (sm2.ts)
├── [ ] CardProgress schema + migration
├── [ ] ReviewHistory schema + migration
├── [ ] Due cards API (/api/v1/study/due-cards)
├── [ ] Review submission API (/api/v1/study/review)
├── [ ] "Study due cards" page
└── [ ] Integration test: SM-2 schedule correctness
```

**SM-2 Algorithm:**
```typescript
// src/features/study/lib/sm2.ts
export interface SM2Result {
  easeFactor: number;
  interval: number;      // days
  repetitions: number;
  nextDueDate: Date;
}

export function calculateSM2(
  easeFactor: number,
  interval: number,
  repetitions: number,
  grade: 0 | 1 | 2 | 3  // AGAIN=0, HARD=1, GOOD=2, EASY=3
): SM2Result {
  const MIN_EASE = 1.3;

  if (grade === 0) {
    // AGAIN: reset repetitions
    return {
      easeFactor: Math.max(MIN_EASE, easeFactor - 0.2),
      interval: 1,
      repetitions: 0,
      nextDueDate: addDays(new Date(), 1),
    };
  }

  if (grade === 1) {
    // HARD: soft interval boost, ease penalty, repetitions preserved
    return {
      easeFactor: Math.max(MIN_EASE, easeFactor - 0.15),
      interval: Math.ceil(interval * 1.2),
      repetitions,
      nextDueDate: addDays(new Date(), Math.ceil(interval * 1.2)),
    };
  }

  // GOOD (2) or EASY (3): passed
  const newRepetitions = repetitions + 1;
  let newInterval: number;

  if (newRepetitions === 1) newInterval = 1;
  else if (newRepetitions === 2) newInterval = 6;
  else newInterval = Math.round(interval * easeFactor);

  const newEaseFactor = Math.max(
    MIN_EASE,
    easeFactor + (0.1 - (3 - grade) * (0.08 + (3 - grade) * 0.02))
  );

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextDueDate: addDays(new Date(), newInterval),
  };
}
```

---

## Phase 5: Dashboard & Search (Ngày 21–24)

```
Tasks:
├── [ ] UserStats model + migration
├── [ ] Streak calculation service
├── [ ] Dashboard page (SSR + Streaming)
│   ├── Stats cards (streak, accuracy, total cards)
│   ├── Activity heatmap (GitHub-style)
│   └── Recent sessions
├── [ ] Full-text search (PostgreSQL tsvector)
│   ├── Migration: add search_vector + GIN index + trigger
│   └── Search page + filters
└── [ ] "X cards due today" alert on dashboard
```

---

## Phase 6: Public Library (Ngày 25–27)

```
Tasks:
├── [ ] Public library page (ISR 5 phút)
├── [ ] Trending algorithm (study_count weighted by recency)
├── [ ] Most Studied sort
├── [ ] Newest sort
├── [ ] Public set preview page
└── [ ] Duplicate public set to own account
```

---

## Phase 7: Polish & Performance (Ngày 28–30)

```
Tasks:
├── [ ] Lighthouse audit → fix issues
├── [ ] Mobile responsive polish
├── [ ] Error boundaries + fallback UI
├── [ ] Loading skeletons mọi async sections
├── [ ] Keyboard navigation accessibility
├── [ ] Rate limiting cho mọi API endpoints
├── [ ] Security headers (CSP, X-Frame-Options, ...)
├── [ ] Bundle analysis (ANALYZE=true pnpm build)
└── [ ] Seed data cho demo
```

---

## Deployment Commands

```bash
# Development
pnpm dev

# Production build (test locally trước khi deploy)
pnpm build
pnpm start

# Database migrations
pnpm prisma migrate dev    # Development
pnpm prisma migrate deploy # Production (trong Vercel build step)

# Vercel deployment
git push origin main       # Auto-deploy via Vercel GitHub integration

# Verify deployment
vercel logs                # Xem serverless function logs
```

**Vercel Build Settings:**
```
Framework Preset: Next.js
Build Command: pnpm prisma migrate deploy && pnpm build
Output Directory: .next
Install Command: pnpm install
```

---

## Tóm tắt Timeline

| Phase | Thời gian | Output |
|---|---|---|
| 0: Foundation | Ngày 1–2 | Empty app deploy, CI/CD |
| 1: Auth + DB | Ngày 3–5 | Auth flow hoàn chỉnh |
| 2: Sets & Cards | Ngày 6–10 | CRUD đầy đủ + media |
| 3: Study Modes | Ngày 11–17 | 4 modes hoạt động |
| 4: Spaced Rep | Ngày 18–20 | SM-2 tích hợp |
| 5: Dashboard + Search | Ngày 21–24 | Analytics + search |
| 6: Public Library | Ngày 25–27 | Discovery feature |
| 7: Polish | Ngày 28–30 | Production-ready |
