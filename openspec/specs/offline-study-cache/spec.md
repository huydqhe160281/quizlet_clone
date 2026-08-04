# Specification: Offline Study Cache

<!--
  Metadata: version 1.3, status: Draft (revised after 3 rounds of 4-perspective review)
  Guidance: Define requirements and verification criteria using engine layers and Gherkin scenarios.
-->

## Purpose

Cache the 5 most-recently-opened study sessions' card content in IndexedDB, compound-keyed per user, so Flashcard/Learn/Test can render offline without a network round-trip for content already viewed online.

## Capability Summary

Recently-opened session card content is mirrored into a per-user, per-set IndexedDB store with LRU eviction, so study surfaces remain readable offline for those sets.

## Engine Layer Map

| Layer     | Area           | Component/Symbol                                                                                                                                                                                                                                       |
| --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Interface | Storage        | `src/features/study-offline/db.ts` (`idb` schema, `sets` store, compound key `[setId, userId]`, value incl. `sessionId`)                                                                                                                               |
| Interface | Cache logic    | `src/features/study-offline/cache.ts` (upsert + LRU eviction, per-user scoped reads)                                                                                                                                                                   |
| Core      | Content source | `getOwnedSessionForStudy` (additive `set: { id, title }` select) **and** `createSession` (attaches a slim `{ id, title }` projection of its already-loaded set — not the full set/cards object — in-memory, no new query) — both in `study.service.ts` |
| Interface | Study surfaces | Flashcard/Learn/Test pages read from cache when offline                                                                                                                                                                                                |
| Interface | Auth lifecycle | Sign-in defensive purge of foreign-`userId` rows; sign-out clears this user's `sets` rows                                                                                                                                                              |

---

## Requirements

### Requirement: Recently-Opened Session Content Cache

Whenever an authenticated user's session-load request (`GET`/`POST /api/v1/study/sessions/**`, covering both the create path and the resume-via-`?sessionId=` path) succeeds, the system SHALL upsert that session's card snapshot (`{cardId, front, back, example, imageUrl}` per card, as already returned by that endpoint) plus the session's own `id` and the parent set's `id`/`title` into a per-`userId` IndexedDB `sets` store keyed by `[setId, userId]`, and stamp `lastAccessedAt`. The parent set's `id`/`title` SHALL be populated on **both** load paths: via one additive `select` on `getOwnedSessionForStudy`'s existing query for the resume path, and via a slim `{ id, title }` projection of the parent set already loaded in-memory (no new query, and explicitly not the full set/cards object that load already fetched for pool selection) for `createSession`'s create/resume-via-idempotent-match path — no new endpoint or additional round-trip SHALL be introduced on either path. After each upsert, if the number of cached entries for that user exceeds **5**, the system SHALL evict the least-recently-accessed entry/entries until at most 5 remain.

**Constraint**: MUST
**Verification**: Unit test for upsert (incl. `sessionId`) + `lastAccessedAt` stamping using the compound key; unit test for eviction beyond 5 entries; unit test asserting neither the `getOwnedSessionForStudy` `select` addition nor `createSession`'s `set` attach introduces a second network request; integration test asserting **both** `getOwnedSessionForStudy`'s and `createSession`'s responses include `set.id`/`set.title`

#### Scenario: Starting or resuming a session online caches it

- **GIVEN** an authenticated user with network connectivity
- **WHEN** they start or resume a Flashcard, Learn, or Test session and it loads successfully, via either the create path or the `?sessionId=` resume path
- **THEN** that session's `id`, its card snapshot, and its parent set's `id`/`title` are upserted into the offline `sets` store under key `[setId, userId]` with an updated `lastAccessedAt`

#### Scenario: LRU eviction beyond 5 entries

- **GIVEN** a user already has 5 entries cached
- **WHEN** they successfully load a session for a 6th distinct set online
- **THEN** the least-recently-accessed of the previously cached entries is evicted, leaving at most 5

#### Scenario: Re-viewing a cached set refreshes recency

- **GIVEN** a user has a set already cached
- **WHEN** they load a session for that same set online again
- **THEN** its `lastAccessedAt` is updated and it is not evicted ahead of less-recently-viewed sets

### Requirement: Per-User Namespacing, Sign-In Defensive Purge, and Sign-Out Content Clearing

All `sets` store records SHALL be keyed to include the `userId` that created them, and every read/write function SHALL require the current `userId` as an explicit parameter (no unscoped "read everything" accessor SHALL exist). On sign-out, the system SHALL delete this user's `sets` rows (content cache only — the mutation queue's sign-out handling is specified in `offline-mutation-queue`). Independently of sign-out, on sign-in / app boot, before rendering any offline content, the system SHALL check whether the `sets` store contains rows for a `userId` other than the newly authenticated session's `userId`, and SHALL purge any such foreign rows. This defensive check SHALL NOT depend on a prior clean sign-out having occurred (it also covers crash/force-quit cases where sign-out never fires).

**Constraint**: MUST
**Verification**: Unit test asserting every `cache.ts` read function filters by `userId`; unit test asserting sign-out deletes only the current user's `sets` rows; unit test asserting a sign-in with a different `userId` than existing cached rows triggers a purge of those foreign rows before any read

#### Scenario: Cache is scoped per user

- **GIVEN** two different users have each cached sets on the same browser profile
- **WHEN** user A's cached content is read
- **THEN** only rows keyed with user A's `userId` are returned, never user B's

#### Scenario: Sign-out clears this user's content cache

- **GIVEN** a signed-in user with cached sets
- **WHEN** they sign out
- **THEN** their `sets` rows are deleted before a new session can read from the store

#### Scenario: Sign-in purges a previous user's residual content

- **GIVEN** the `sets` store contains rows for `userId = A` (e.g. because a prior sign-out never cleanly fired — crash, force-quit)
- **WHEN** a different user `B` signs in on the same device
- **THEN** user A's rows are purged before any offline content is rendered to user B, without requiring user A to have signed out cleanly

### Requirement: Offline-Readable Study Content, Scoped to a Matching Cached Session

When the browser is offline and the user opens Flashcard, Learn, or Test via the `?sessionId=` resume path, and the `sets` store holds an entry for that set whose cached `sessionId` **matches the requested `sessionId`**, the system SHALL render that session's cards from the IndexedDB cache instead of failing the page load. Rendering from the cache in this matching-`sessionId` case means the offline continuation has a real, addressable session to submit answers/completion against — it is a genuine resume, not a read-only preview. Text fields (front/back/example) SHALL render reliably from the cache; image/audio fields (`imageUrl`/`audioUrl`) are cached as reference strings only, and the system is NOT required to guarantee the referenced media loads while offline. When the browser is offline and either (a) the requested set has no cached entry at all, or (b) a cached entry exists for that set but its `sessionId` does not match the one being resumed (a stale/superseded cached session), the system MAY show a clear message indicating the set/session is not available offline, without crashing the study surface. Starting a brand-new session (no `sessionId` in the URL) always requires network and is unaffected by this requirement (see Non-Goals).

**The resume path's session-load request SHALL be wrapped in `try`/`catch` — it is not today.** Verified the resume (`?sessionId=`) fetch, unlike the create-session fetch, has no error handling in the current codebase; a genuine offline `fetch()` call throws a network-level error rather than resolving with a non-ok response, so without an explicit `catch` around this specific call, the cache-read fallback described above has no code path that would ever invoke it against a real offline failure. This `try`/`catch` is a required part of implementing this requirement, not pre-existing infrastructure this requirement merely reuses.

**Constraint**: MUST
**Verification**: Component/integration test resuming a cached session (matching `sessionId`) with network mocked as unavailable (the resume fetch rejecting/throwing, not merely resolving non-ok), asserting text fields render and the session remains answerable; component test asserting graceful messaging when the cached entry's `sessionId` does not match the requested one; component test asserting graceful messaging for a set with no cached entry at all; regression test asserting the resume path's `try`/`catch` does not swallow or alter behavior for non-network errors (e.g. a genuine 404 from the server still shows the existing error state, not a cache fallback)

#### Scenario: Offline resume of a session matching the cache

- **GIVEN** the `sets` store has an entry for a set whose cached `sessionId` equals the `sessionId` being requested
- **WHEN** the browser is offline and the user opens Flashcard, Learn, or Test via `?sessionId=` for that same session
- **THEN** the cards' text fields render from the offline cache, the study flow is usable, and answers can still be recorded against that `sessionId`

#### Scenario: Offline resume of a session not matching the cache

- **GIVEN** the `sets` store has an entry for a set, but its cached `sessionId` differs from the `sessionId` being requested (e.g. an older, superseded session for the same set)
- **WHEN** the browser is offline and the user opens Flashcard, Learn, or Test via `?sessionId=` for the non-matching session
- **THEN** the UI shows a clear "not available offline" message instead of silently rendering the wrong session's content

#### Scenario: Offline study on an uncached set

- **GIVEN** a set has no entry at all in the offline cache for the current user
- **WHEN** the browser is offline and the user attempts to open that set for study
- **THEN** the UI shows a clear "not available offline" message instead of an unhandled error

#### Scenario: Media may be unavailable offline

- **GIVEN** a cached card has a non-null `imageUrl`
- **WHEN** the card is rendered offline and the image asset itself was never cached
- **THEN** the text fields still render correctly and the missing image does not block or crash the study flow

---

## Out of Scope

- Caching sets the user has not opted into by starting/resuming a session for them (no explicit "download for offline" UI in this phase)
- Caching `WRITE`/`DRAW` mode content
- Fetching and storing card image/audio assets as blobs for guaranteed offline media
- Server-side storage or sync of the offline cache itself (it is purely a local read cache)
- Configurable cache size / user-facing storage settings
- Starting a brand-new `StudySession` (no `sessionId` yet) while offline — the create path always requires network; only a **resume** whose cached `sessionId` matches the one being requested can be served offline (see the scoped requirement above)
- Serving offline content for a resume whose cached entry belongs to a **different** (stale/superseded) `sessionId` for the same set — the cache is keyed to a specific session snapshot, not "any content ever seen for this set"
