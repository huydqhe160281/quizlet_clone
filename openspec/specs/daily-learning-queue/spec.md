# daily-learning-queue Specification

## Purpose

Authenticated learners receive a capped, ranked queue of due, weak, and new cards to practice today (Adaptive Learning Coach Phase 1).

## Requirements

### Requirement: Prioritized Queue Composition

The system SHALL build a learning queue for the authenticated user from **owned sets only**, composed of:

1. **Due** cards: `CardProgress` where `userId` matches, `dueDate <= now`, **and** the card's set is explicitly verified to be owned by that `userId` (an explicit `card.set.userId === userId` filter/join — this is a stricter guard than simply reusing `getDueCards`'s bare `CardProgress.userId` filter, so progress rows for cards in sets the user no longer owns can never leak in)
2. **Weak** cards: not already selected as due; same owned-set guard; `easeFactor < 2.0` **or** latest `ReviewHistory` grade in `{AGAIN, HARD}` within the last 7 UTC days
3. **New** cards: owned flashcards with no `CardProgress` row for that user

Each queue item SHALL include at least: `cardId`, `setId`, `setTitle`, `reason` (`due` | `weak` | `new`), and ranking-related fields needed for stable ordering (`dueDate`, `easeFactor` when applicable).

**Constraint**: MUST  
**Verification**: Unit tests `learning-queue.test.ts` (composition + ordering fixtures)

#### Scenario: Due cards appear before new cards when both exist

- **GIVEN** user has 2 due progress cards and 3 never-studied cards
- **WHEN** the learning queue is built with default limit
- **THEN** both due cards appear in the returned list ahead of new cards (by rank score), and each due item has `reason: "due"`

#### Scenario: Weak card included when not due

- **GIVEN** a progress card with `dueDate` tomorrow and `easeFactor = 1.8`
- **WHEN** the learning queue is built
- **THEN** the card is included with `reason: "weak"`

#### Scenario: Weak card not duplicated when also due

- **GIVEN** a card that is both due and low ease factor
- **WHEN** the learning queue is built
- **THEN** the card appears once with `reason: "due"`

#### Scenario: Public library cards not owned are excluded

- **GIVEN** due progress only exists for cards in another user's public set that this user does not own
- **WHEN** the learning queue is built for the current user
- **THEN** those cards are not included (owned-set filter)

#### Scenario: Stale progress after set ownership change excluded

- **GIVEN** a `CardProgress` row exists for `userId` on a card whose set is no longer owned by that `userId` (e.g. set was transferred or deleted-and-recreated)
- **WHEN** the learning queue is built
- **THEN** the explicit owned-set guard excludes that card even though the raw `CardProgress.userId` matches

### Requirement: Deterministic Ranking and Cap

The system SHALL rank queue items with a deterministic score (higher first) using overdue urgency, low ease, recent-fail bonus, and a small new-card boost, with stable tie-break `dueDate ASC` then `cardId ASC`. The API SHALL return at most `limit` items (default **30**, maximum **50**) under `queue.items`, and SHALL expose the uncapped eligible count as `queue.totalEligible` (this exact field name is used consistently by the API, design brief, and detail design — no alternate name such as `total` or `count`).

**Constraint**: MUST  
**Verification**: Unit tests asserting order stability for equal scores; API contract test for `limit` clamp

#### Scenario: Default cap

- **GIVEN** user has 80 eligible queue cards
- **WHEN** `GET /api/v1/today` is called without an explicit limit
- **THEN** `queue.items` length is ≤ 30 and `queue.totalEligible` equals 80

#### Scenario: Limit clamp

- **GIVEN** an authenticated request
- **WHEN** the client requests `limit=999`
- **THEN** the server clamps to 50

#### Scenario: Stable tie-break

- **GIVEN** two due cards with identical rank inputs except `cardId`
- **WHEN** the queue is built twice
- **THEN** relative order is identical both times
