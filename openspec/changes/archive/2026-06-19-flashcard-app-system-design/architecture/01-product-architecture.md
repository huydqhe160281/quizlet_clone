# Product Architecture

## 1. Phân tích tính năng Quizlet (Nguồn cảm hứng)

Quizlet có các tính năng cốt lõi sau mà chúng ta lấy làm benchmark:

| Tính năng | Quizlet | Sản phẩm của chúng ta | Cải tiến |
|---|---|---|---|
| Flashcard flip | ✅ CSS 3D flip | ✅ CSS 3D flip mượt hơn | Framer Motion spring animation |
| Study modes | Flashcards, Learn, Write, Test, Match | Flashcards, Learn, Write, Test | Bỏ Match (game), tập trung UX |
| Spaced repetition | Chỉ premium | ✅ Free, SM-2 algorithm | Miễn phí, tích hợp sâu |
| Public library | ✅ | ✅ | Full-text search với pg_trgm |
| Image per card | ✅ Premium | ✅ Free via Supabase Storage | Không paywall |
| Audio per card | ✅ Premium | ✅ Free via Supabase Storage | Không paywall |
| Dashboard | Basic | Rich (streak, accuracy, heatmap) | GitHub-style activity heatmap |
| Collaboration | ✅ Class/Group | ❌ Out of scope | Đơn giản hơn, tập trung solo |
| Mobile app | ✅ Native | ✅ Responsive PWA | Progressive enhancement |

## 2. Kiến trúc sản phẩm tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER LAYER                                  │
│  Browser (Desktop/Mobile) ←→ Next.js App (Vercel Edge Network)      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │ HTTPS
┌───────────────────────────────────▼─────────────────────────────────┐
│                        PRESENTATION LAYER                            │
│  Next.js 15 App Router                                               │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │  Server Components│  │Client Components│  │  Route Handlers (API)│  │
│  │  (SSR + Streaming)│  │  (Interactive) │  │  /api/v1/**          │  │
│  └─────────────────┘  └────────────────┘  └──────────────────────┘  │
│                                                                      │
│  Edge Middleware (Auth check, rate limit headers)                    │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                        APPLICATION LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  AuthService │  │  CardService │  │  StudyService│               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ SearchService│  │MediaService  │  │  SM2Engine   │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                         DATA LAYER                                   │
│  ┌─────────────────────────┐   ┌─────────────────────────────────┐  │
│  │  Supabase PostgreSQL    │   │  Supabase Storage               │  │
│  │  (Prisma ORM)           │   │  (image/ audio/ per card)       │  │
│  └─────────────────────────┘   └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. User Journey Map

### Journey 1: Lần đầu sử dụng
```
Landing Page → Register/Google OAuth → Onboarding → Create First Set
→ Add Cards (với Image/Audio) → Start Study (Flashcard Mode)
→ Dashboard (xem streak ngày 1)
```

### Journey 2: Học hàng ngày (Returning User)
```
Login → Dashboard (thấy due cards từ SM-2) → Study due cards
→ Review results → Update streak → Explore Public Library (nếu còn time)
```

### Journey 3: Tìm bộ học công khai
```
Search / Public Library → Filter (language, topic) → Preview set
→ Duplicate vào account → Customize → Study
```

## 4. Feature Module Map

```
app/
├── (auth)/          # Authentication flows
│   ├── login
│   ├── register
│   └── forgot-password
├── (dashboard)/     # Protected routes
│   ├── dashboard    # Home after login
│   ├── sets/        # FlashcardSet management
│   │   ├── [setId]/ # Single set view + study modes
│   │   └── new/     # Create set
│   ├── study/       # SM-2 due cards queue
│   └── search/      # Full-text search
└── (public)/        # Public routes
    ├── library/     # Public library
    └── shared/[setId] # Public set preview at /shared/[setId]
```

## 5. Data Flow: Study Session (SM-2)

```
User clicks "Study Due Cards"
         │
         ▼
GET /api/v1/study/due-cards
         │ (SQL: WHERE due_date <= NOW() ORDER BY due_date ASC LIMIT 20)
         ▼
Client receives card batch
         │
         ▼
User reviews card → marks "Easy" / "Good" / "Hard" / "Again"
         │
         ▼
POST /api/v1/study/review { cardId, grade }
         │
         ▼
SM2Engine.calculate(card.ease_factor, card.interval, grade)
         │ returns { new_ease_factor, new_interval, next_due_date }
         ▼
UPDATE card_progress SET ease_factor, interval, due_date
         │
         ▼
INSERT review_history { card_id, grade, reviewed_at }
         │
         ▼
UPDATE user_stats (streak, accuracy, daily_count)
         │
         ▼
Optimistic UI update (React Query mutation)
```
