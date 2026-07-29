# recommended-study-session Specification

## Purpose

Today returns a single recommended next action that composes existing spaced-repetition and set study session entry points without creating cross-set sessions.

## Engine Layer Map

| Layer     | Area        | Component/Symbol                                    |
| --------- | ----------- | --------------------------------------------------- |
| Service   | `learning/` | `buildRecommendation` → `cardIds`                   |
| Interface | API / UI    | Today CTA passes server `cardIds` to session create |

## Requirements

### Requirement: Recommendation Rules

The system SHALL return a `recommendation` object on `GET /api/v1/today` computed deterministically, in this exact order, against `queue.items` (the same capped list returned to the client) and `queue.totalEligible`:

1. If `totalEligible === 0` → `kind: "empty"`, `href: "/sets"`, `setId: null`, `mode: null`. No `StudySession` is created.
2. Else if `queue.items` contains **more than one** distinct `setId` → `kind: "spaced"`, `href: "/study?source=today"`, `setId: null`, `mode: null`.
3. Else (all `queue.items` share exactly **one** `setId`) → `kind: "set-session"`, that `setId`, `mode: "LEARN"`, `href: "/sets/{setId}/learn"`.

There is no separate partial-dominance branch (e.g. "≥ 70% but multiple sets") in Phase 1: step 2 unconditionally routes every multi-set queue to `spaced`, so `set-session` only ever fires for a strictly single-set queue.

When `kind === "set-session"`, the recommendation object SHALL include `cardIds: string[]` equal to the `cardId`s of all `queue.items` that share that `setId` (non-empty). For `kind` in `{ spaced, empty }`, `cardIds` SHALL be `null` or omitted. The server recommendation is the SSOT — the client MUST NOT re-derive cardIds from the queue as the authoritative list.

The recommendation SHALL NOT create a `StudySession` that mixes cards from multiple `setId`s in Phase 1.

**Constraint**: MUST  
**Verification**: Unit tests `recommendation.test.ts` for each branch; no new StudyMode enum value required

#### Scenario: Multi-set due prefers spaced

- **GIVEN** due cards in set A and set B both present in `queue.items`
- **WHEN** recommendation is built
- **THEN** `kind = "spaced"` and `href = "/study?source=today"`

#### Scenario: Single-set dominance prefers set session

- **GIVEN** 10 `queue.items`, all from set A (no other sets present)
- **WHEN** recommendation is built
- **THEN** `kind = "set-session"`, `setId = A`, `mode = "LEARN"`, `href = "/sets/A/learn"`

#### Scenario: Single weak card still resolves to set-session

- **GIVEN** `queue.items` contains exactly one item (a weak card) from set A and no other set is present
- **WHEN** recommendation is built
- **THEN** `kind = "set-session"` for set A (single-set rule applies regardless of item count)

#### Scenario: Two sets with lopsided counts still prefers spaced

- **GIVEN** `queue.items` has 29 cards from set A and 1 card from set B (set A is 96.7% of the queue)
- **WHEN** recommendation is built
- **THEN** `kind = "spaced"` — Phase 1 has no dominance-percentage branch; presence of more than one distinct `setId` always routes to `spaced`

#### Scenario: Empty queue

- **GIVEN** user has no due, weak, or new eligible cards (`totalEligible = 0`)
- **WHEN** recommendation is built
- **THEN** `kind = "empty"`, `href = "/sets"`, and no study session create is implied

#### Scenario: No auto-create on Today load

- **GIVEN** an authenticated user opens `/today`
- **WHEN** `GET /api/v1/today` succeeds
- **THEN** no new `StudySession` row is created solely by loading Today

#### Scenario: set-session includes queue cardIds

- **GIVEN** 3 `queue.items` all from set A
- **WHEN** recommendation is built
- **THEN** `kind = "set-session"` and `cardIds` contains exactly those 3 card ids

#### Scenario: spaced has no cardIds

- **GIVEN** queue items from set A and set B
- **WHEN** recommendation is built
- **THEN** `kind = "spaced"` and `cardIds` is null/omitted

### Requirement: Preserve Existing Session Contracts

When the user accepts a `set-session` recommendation, the client SHALL call the existing `POST /api/v1/study/sessions` endpoint with `{ setId, mode: "LEARN", cardIds }` using `recommendation.cardIds` — no new session-create endpoint, request shape, or `StudyMode` value is introduced by this change — and SHALL navigate to the existing route `/sets/{setId}/learn?sessionId={session.id}` (the same route reached today via `StudyLauncher` → `StudySettingsModal`). Omitted `cardIds` on other callers SHALL preserve full-set Phase 1 behavior. Session creation SHALL use the existing idempotent `createSession(userId, setId, mode, settings?)` behavior (resume incomplete matching session when applicable). Relative to Phase 1 "Resume incomplete LEARN session": a full-set incomplete session MUST NOT be resumed when Today supplies a non-empty subset `cardIds` (membership inequality).

**Constraint**: MUST  
**Verification**: Reuse existing `study.service` session tests; smoke test from Today CTA path; assert no new route file or API route is added for session creation; Today CTA test; study.service cardIds tests (resume matrix owned by study-modes)

#### Scenario: Resume incomplete LEARN session

- **GIVEN** an incomplete LEARN session already exists for set A with matching settings and the same card membership as the request
- **WHEN** the user starts the Today set-session recommendation for set A LEARN
- **THEN** the existing session is resumed rather than duplicated (same idempotency rules as today), and the client still navigates to `/sets/A/learn?sessionId={session.id}`

#### Scenario: Reused endpoint only

- **GIVEN** the Today set-session CTA is accepted
- **WHEN** the create-session request is inspected
- **THEN** it targets `POST /api/v1/study/sessions` (the existing endpoint) — no `/api/v1/today/sessions` or similar new endpoint exists

#### Scenario: Today LEARN uses subset

- **GIVEN** recommendation `cardIds = [c1, c2]` for set A
- **WHEN** the user starts the Today set-session CTA
- **THEN** the created/resumed session's session cards are exactly `{c1, c2}` (order may differ if randomized)

#### Scenario: Full-set incomplete does not resume for subset Today CTA

- **GIVEN** an incomplete LEARN session for set A that materializes the full set pool, and Today recommendation `cardIds = [c1, c2]` (proper subset)
- **WHEN** the user starts the Today set-session CTA
- **THEN** a new subset session is created (the full-set incomplete is not resumed)
