# dashboard-search-library Specification

## Purpose

TBD - created by archiving change flashcard-app-system-design. Update Purpose after archive.

## Requirements

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

#### Scenario: Streak On Session Resume

- **GIVEN** user has currentStreak=1, lastStudiedDate=yesterday, and an incomplete StudySession
- **WHEN** they resume that session via Recent Sessions (`GET /api/v1/study/sessions/:id` with `?sessionId=`) or complete it
- **THEN** daily study activity is recorded, `currentStreak = 2`, and the navbar streak badge updates when `changed=true`

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
- **THEN** response includes daily counts for the past 365 days (zero-filled), aggregating spaced-repetition `reviewHistory` and answered `sessionCard` rows

#### Scenario: Performance

- **GIVEN** user with 2 years of review history
- **WHEN** GET `/api/v1/dashboard/activity`
- **THEN** response returns in < 200ms (ensured by `(userId, reviewedAt DESC)` index + DATE_TRUNC aggregation)

---

### Requirement: Recent Sessions

The system SHALL display up to 5 recent study sessions on the Dashboard, **grouped by set + mode** (one row per set/mode: prefer completed, else highest progress, else newest), showing set name, mode, progress percent (`answeredCount / totalCards`), and status. When completed, accuracy (`score` = `correctCount / totalCards`) MAY be shown separately from progress.
**Constraint**: MUST
**Verification**: Unit test `stats.service.test.ts` (`getRecentSessions`)

#### Scenario: Recent Sessions List

- **GIVEN** user finished round 1 of a 10-card LEARN session (7 cards answered if `cardsPerRound=7`, or 10 if one round)
- **WHEN** Dashboard loads
- **THEN** Recent sessions shows that session with progress ≈ answered/total (e.g. 70% or 100%), labeled in-progress until `completedAt` is set

#### Scenario: Multiple Incomplete Sessions Same Set

- **GIVEN** user has two in-progress LEARN sessions for the same set (e.g. from Strict Mode remount or restart)
- **WHEN** Dashboard loads Recent sessions
- **THEN** only one row is shown for that set+mode (the higher-progress or newer session)

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
- **THEN** alert shows a clear empty / “all caught up” state (e.g. "You're all caught up! 🎉" or equivalent) without implying failure

---

### Requirement: Due Study Priority On Dashboard

The system MUST present “need to study today” / due (or otherwise actionable study) signals with higher visual and interaction priority than vanity statistics when both are shown on the Dashboard.

#### Scenario: Due signal outranks vanity stats

- **GIVEN** the learner has due or actionable study work and also has streak/aggregate vanity stats
- **WHEN** they view the Dashboard
- **THEN** the due/actionable study region appears before vanity stats in document reading order (DOM order), and vanity stats are not the first interactive study call-to-action

#### Scenario: Zero due still shows clear empty guidance

- **GIVEN** the learner has no due/actionable study items
- **WHEN** they view the Dashboard
- **THEN** the due/priority region shows a clear empty or “all caught up” state without implying failure, and vanity stats remain secondary

---

### Requirement: Dashboard Data Load Efficiency

The system MUST load Dashboard stats, activity, and recent sessions without redundant client waterfalls that re-fetch the same server-provided initial data on mount, unless a documented P0 requires a live refresh.

#### Scenario: Initial dashboard uses server-provided data

- **GIVEN** the Dashboard page has already fetched stats/activity/sessions on the server
- **WHEN** the Dashboard client hydrates
- **THEN** it does not immediately re-request the same payloads in a waterfall that blocks first paint of primary content

---

### Requirement: Activity Query Coalesce

The system MUST compute the Dashboard activity heatmap series with a single round-trip query (or equivalent coalesced path) for the configured activity window, rather than dual independent full-window queries that duplicate date-series work.

#### Scenario: Activity loads with one query round-trip

- **GIVEN** the Dashboard requests activity for the standard window (e.g. 365 days)
- **WHEN** `getActivity` (or successor) runs
- **THEN** the implementation performs a single coalesced database round-trip for that series (e.g. `UNION ALL` of sessions and reviews), not two separate full-window scans

---

### Requirement: Search And Library Discoverability UX

The system MUST present actionable empty, error, and pagination affordances on Library and Search surfaces so learners can recover or continue browsing without a silent blank page.

#### Scenario: Library empty and error states

- **GIVEN** the learner opens the public Library
- **WHEN** the list is empty or the fetch fails
- **THEN** the UI shows a clear empty message with a next action (e.g. go to my sets) or an error message with Retry

#### Scenario: Search empty and error states

- **GIVEN** the learner submits a search query (or browses newest via Search)
- **WHEN** there are no matches or the fetch fails
- **THEN** the UI shows a clear empty message with a next action (e.g. clear/browse newest) or an error message with Retry

#### Scenario: Cursor pagination Load more

- **GIVEN** Library or Search API responses include `pagination.hasMore` / `nextCursor`
- **WHEN** more pages are available
- **THEN** the client exposes a Load more (or equivalent) control that fetches the next cursor page and appends results

---

### Requirement: Shared Public Set Preview Resilience

The system MUST cache public set preview reads for shared pages and surface actionable feedback when duplicate-to-library fails.

#### Scenario: Preview fetch uses shared cache

- **GIVEN** a learner opens `/shared/{setId}`
- **WHEN** metadata and page content load the public preview
- **THEN** both paths use the cached public-set-preview loader (tagged/revalidated), not an uncached duplicate query path per request without shared cache

#### Scenario: Duplicate failure is actionable

- **GIVEN** the learner taps Duplicate on a shared preview
- **WHEN** the duplicate API fails (e.g. 401 or network)
- **THEN** the UI shows what went wrong and offers Retry (or sign-in guidance when unauthorized)

---

### Requirement: Full-Text Search

The system SHALL search FlashcardSets by title and description using PostgreSQL tsvector (FTS-first with prefix fallback as implemented). When the requester is authenticated, results MUST include matching **public** sets and the requester’s **own** sets; anonymous requests MUST only include public sets. User-scoped result sets MUST NOT share the anonymous public search cache entry.
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

#### Scenario: Authenticated search includes own sets

- **GIVEN** a signed-in user owns a private or public set whose title matches the query, and other public sets also match
- **WHEN** GET `/api/v1/search?q=…` runs with that user’s session
- **THEN** the response may include the user’s own matching sets in addition to public matches, ranked by the search ranking rules

#### Scenario: Anonymous search is public-only

- **GIVEN** no authenticated user
- **WHEN** GET `/api/v1/search?q=…`
- **THEN** only `visibility = PUBLIC` sets are returned

---

### Requirement: Public Library

The system SHALL list public FlashcardSets with sort options newest (default), trending, and most_studied. Trending MUST rank by study-session volume in the last 7 days. Library list responses used by the public Library page SHOULD be served through the tagged public-library cache wrapper. When trending keyset pagination is unsupported, further cursor pages MUST return an empty page with `hasMore: false` rather than incorrect ordering.
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

#### Scenario: Trending by seven-day volume

- **GIVEN** public sets with study sessions in and outside the last 7 days
- **WHEN** GET `/api/v1/library?sort=trending`
- **THEN** sets are ordered by count of sessions in the last 7 days (then recency/id tie-breakers as implemented)

#### Scenario: Trending cursor stops safely

- **GIVEN** a trending first page was returned
- **WHEN** a subsequent request includes a trending `cursor`
- **THEN** the API returns an empty data page with `hasMore: false` (no falsely ordered continuation)

#### Scenario: ISR Cache

- **GIVEN** Library page was cached 4 minutes ago
- **WHEN** a new public set is created
- **THEN** the Library page still shows old cache; after 5 minutes (ISR revalidate=300), the new set appears

---
