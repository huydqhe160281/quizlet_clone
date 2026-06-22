# Specification: Dashboard, Search & Public Library

## Capability Summary
Người dùng thấy tổng quan học tập của mình (streak, accuracy, activity heatmap) trên Dashboard; có thể tìm kiếm bộ học bằng full-text search; và khám phá kho học liệu công khai được sort theo trending/most-studied/newest.

## Layer Map

| Layer | Component | Symbol / Path |
|---|---|---|
| UI | Dashboard | `src/app/(app)/dashboard/page.tsx` (SSR + Streaming) |
| UI | Search | `src/app/(app)/search/page.tsx` |
| UI | Library | `src/app/(public)/library/page.tsx` (ISR 300s) |
| UI | Public Preview | `src/app/(public)/shared/[setId]/page.tsx` — public set preview at `/shared/[setId]` |
| UI | Components | `src/features/dashboard/`, `src/features/search/`, `src/features/library/` |
| API | Dashboard | `src/app/api/v1/dashboard/stats/`, `/activity/`, `/recent-sessions/` |
| API | Search | `src/app/api/v1/search/route.ts` |
| API | Library | `src/app/api/v1/library/route.ts` |
| Service | Stats | `src/server/services/stats.service.ts` |
| Service | Search | `src/server/services/search.service.ts` |
| DB | Tables | `UserStats`, `ReviewHistory`, `StudySession`, `FlashcardSet` (tsvector) |

---

## ADDED Requirements

### Requirement: Dashboard Statistics
The system SHALL display current streak, longest streak, total reviews, cards studied (distinct cards reviewed), accuracy rate, and total sets/cards on the Dashboard.
**Constraint**: MUST
**Verification**: Integration test `dashboard/stats.test.ts`

#### Scenario: Stats Display — Accuracy and Counts
- **GIVEN** user has completed 80 correct reviews out of 100 total; has studied 45 distinct cards; has 5 sets with 120 cards total
- **WHEN** they view the Dashboard
- **THEN** stats show: `accuracy = 80%`, `totalReviews = 100`, `cardsStudied = 45`, `totalSets = 5`, `totalCards = 120`

#### Scenario: Stats — Zero State
- **GIVEN** a brand-new user with no reviews
- **WHEN** they view the Dashboard
- **THEN** stats show all zeros; no divide-by-zero error; empty state illustration shown

#### Scenario: Streak Calculation
- **GIVEN** user reviewed cards on days: Mon, Tue, Wed (3 consecutive days), then missed Thu, reviewed Fri
- **WHEN** they view the Dashboard on Friday
- **THEN** `currentStreak = 1` (only today counts), `longestStreak = 3`

#### Scenario: Streak Maintained
- **GIVEN** user has currentStreak=5, lastStudiedDate=yesterday
- **WHEN** they complete any review today
- **THEN** `currentStreak = 6`, `lastStudiedDate = today`

#### Scenario: Streak Broken
- **GIVEN** user has currentStreak=5, lastStudiedDate=2 days ago
- **WHEN** they view Dashboard today
- **THEN** `currentStreak = 0` (streak broken)

---

### Requirement: Activity Heatmap
The system SHALL provide daily review counts for the past 365 days to render a GitHub-style activity heatmap.
**Constraint**: MUST
**Verification**: Integration test `dashboard/activity-heatmap.test.ts`

#### Scenario: Activity Data
- **GIVEN** user reviewed 15 cards yesterday and 0 cards today
- **WHEN** GET `/api/v1/dashboard/activity`
- **THEN** response includes `{ date: "yesterday", count: 15 }` and today is omitted (or `count: 0`)

#### Scenario: Performance
- **GIVEN** user with 2 years of review history
- **WHEN** GET `/api/v1/dashboard/activity`
- **THEN** response returns in < 200ms (ensured by `(userId, reviewedAt DESC)` index + DATE_TRUNC aggregation)

---

### Requirement: Recent Sessions
The system SHALL display the 5 most recent study sessions on the Dashboard, showing set name, mode, timestamp, and card count.
**Constraint**: MUST
**Verification**: Integration test `dashboard/recent-sessions.test.ts`

#### Scenario: Recent Sessions List
- **GIVEN** user completed 8 study sessions in the past week
- **WHEN** GET `/api/v1/dashboard/recent-sessions`
- **THEN** response returns the 5 most recent sessions ordered by `completedAt DESC`, each containing: `setTitle`, `mode`, `completedAt`, `cardCount`

#### Scenario: No Sessions Yet
- **GIVEN** a new user with no study sessions
- **WHEN** GET `/api/v1/dashboard/recent-sessions`
- **THEN** response returns `{ data: [] }` (empty array, no error)

---

### Requirement: Due Cards Alert
The system SHALL show a "X cards due today" alert on the Dashboard linking to the SM-2 study page.
**Constraint**: MUST

#### Scenario: Due Cards Available
- **GIVEN** user has 12 cards with `dueDate <= NOW()`
- **WHEN** Dashboard loads
- **THEN** alert shows "12 cards due for review today" with link to `/study`

#### Scenario: No Due Cards
- **GIVEN** user has 0 due cards
- **WHEN** Dashboard loads
- **THEN** alert shows "You're all caught up! 🎉"

---

### Requirement: Full-Text Search
The system SHALL search public and user's own FlashcardSets by title and description using PostgreSQL tsvector.
**Constraint**: MUST
**Verification**: Integration test `search/full-text.test.ts`

#### Scenario: Basic Search
- **GIVEN** public sets with titles "English Vocabulary", "French Verbs", "IELTS Vocabulary"
- **WHEN** user searches for "vocabulary"
- **THEN** "English Vocabulary" and "IELTS Vocabulary" are returned, ranked by ts_rank DESC

#### Scenario: Search with Language Filter
- **GIVEN** multiple vocabulary sets in different languages
- **WHEN** user searches "vocabulary" with `?language=en`
- **THEN** only sets with `language = 'en'` are returned

#### Scenario: Search with Tag Filter
- **GIVEN** public sets tagged "IELTS", "TOEFL", "vocabulary"
- **WHEN** user searches with `?tagId=<ielts-tag-id>`
- **THEN** only sets containing the "IELTS" tag are returned (combined with any text query if also provided)

#### Scenario: Empty Query
- **GIVEN** search query is empty string
- **WHEN** GET `/api/v1/search?q=`
- **THEN** API returns 400 `{ error: "QUERY_REQUIRED" }`

#### Scenario: No Results
- **GIVEN** no sets match the search query
- **WHEN** GET `/api/v1/search?q=xyzabcnonexistent`
- **THEN** response is `{ data: [], pagination: { hasMore: false, nextCursor: null } }`

---

### Requirement: Public Library
The system SHALL list public FlashcardSets with 3 sort options: newest (default), trending, most_studied.
**Constraint**: MUST
**Verification**: Integration test `library/public-library.test.ts`

#### Scenario: Newest Sort
- **GIVEN** public sets with createdAt dates
- **WHEN** GET `/api/v1/library?sort=newest`
- **THEN** sets returned ordered by `createdAt DESC`

#### Scenario: Most Studied Sort
- **GIVEN** public sets with varying study session counts
- **WHEN** GET `/api/v1/library?sort=most_studied`
- **THEN** sets returned ordered by `COUNT(study_sessions) DESC`

#### Scenario: Trending Sort
- **GIVEN** sets with recent study activity
- **WHEN** GET `/api/v1/library?sort=trending`
- **THEN** sets with most study sessions in the last 7 days appear first (recency-weighted)

#### Scenario: ISR Cache
- **GIVEN** Library page was cached 4 minutes ago
- **WHEN** a new public set is created
- **THEN** the Library page still shows old cache; after 5 minutes (ISR revalidate=300), the new set appears

---

## Out of Scope
- Elasticsearch / Algolia integration
- Faceted search (complex multi-filter UI)
- User-generated ratings/reviews for public sets
- Recommended sets (ML-based personalization)
- Following users / social feed
