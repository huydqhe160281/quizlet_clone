# Specification: Offline Sync Replay

<!--
  Metadata: version 1.3, status: Draft (revised after 3 rounds of 4-perspective review)
  Guidance: Define requirements and verification criteria using engine layers and Gherkin scenarios.
-->

## Purpose

Replay the durable offline mutation queue against the existing study APIs, one mutation at a time in original per-device order, on every realistic reconnect scenario (including the app having been fully closed while offline), with correct handling of rate limiting and stale references, and give the learner visible confirmation of sync status.

## Capability Summary

When the app regains connectivity — including simply being reopened while already online — queued mutations replay sequentially, one request per mutation, in original order; permanently-invalid entries are isolated without blocking the rest of the queue; rate-limit responses are retried rather than discarded; and a locale-aware status indicator shows pending/failed counts plus a confirmation once fully synced.

## Engine Layer Map

| Layer     | Area            | Component/Symbol                                                                                                                                                                                                                                                                                                                                              |
| --------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interface | Replay engine   | `src/features/study-offline/replay.ts` (`replayPendingMutations(userId)`)                                                                                                                                                                                                                                                                                     |
| Interface | Trigger         | `StudyOfflineSyncProvider` (`online` / `visibilitychange` / mount / manual triggers)                                                                                                                                                                                                                                                                          |
| Interface | Concurrency     | Web Locks API guard (`navigator.locks`) around replay                                                                                                                                                                                                                                                                                                         |
| Interface | UI              | Sync-status indicator, failed-completion notice, "Sync now", "✓ Synced" confirmation                                                                                                                                                                                                                                                                          |
| Core      | Server contract | `PATCH /sessions/[id]` batch-answers response `{ data: { recorded, reason? } }` (route already passes the service result through under `data`, no route change); `PATCH /sessions/[id]` complete-branch response `{ data: <session>, streak, alreadyCompleted? }` (route destructure must be updated to forward `alreadyCompleted`, or it's silently dropped) |
| Interface | i18n            | `messages/{vi,en,ja}/pwa.json` (`CATALOG_FILES`)                                                                                                                                                                                                                                                                                                              |

---

## Requirements

### Requirement: Ordered Sequential Replay, One Mutation Per Request

When triggered, the system SHALL read all `mutations` rows with `status: 'pending'` for the current `userId`, sort them by `clientTimestamp` ascending (ties broken by insertion order), and submit them to their corresponding endpoint **sequentially and individually** — each mutation as its own single-item request, awaiting each outcome before starting the next — rather than batching multiple queued mutations into one request or running them in parallel. On a response classified as success (see the Four-Way Failure Classification requirement for the exact success/failure test — success is determined by the _absence_ of a `reason`/`alreadyCompleted: true` field, **not** by whether `recorded` is greater than zero, since a fully-already-applied batch legitimately returns `recorded: 0` as a success), the corresponding row SHALL be removed from the queue.

**Constraint**: MUST
**Verification**: Unit test asserting mutations are submitted in `clientTimestamp` order, one at a time as individual single-item requests (no batching of queued rows, no overlapping in-flight requests); integration test asserting the resulting `CardProgress` state after offline+replay, for a single device, matches the state that would result from submitting the same review sequence online in the same order

#### Scenario: Replay processes mutations individually and in order

- **GIVEN** multiple `mutations` rows queued while offline with distinct `clientTimestamp` values
- **WHEN** replay is triggered
- **THEN** each mutation is submitted as its own request to the server in ascending `clientTimestamp` order, each awaited before the next begins

#### Scenario: Replay preserves single-device SRS correctness

- **GIVEN** two offline reviews of the same card, queued in a specific chronological order on one device
- **WHEN** replay submits both reviews individually in that same order
- **THEN** the resulting `CardProgress` (`easeFactor`, `interval`, `repetitions`, `dueDate`) matches what would result from submitting those same two reviews online in that order

#### Scenario: Successful replay removes the queue entry

- **GIVEN** a pending mutation is successfully submitted during replay and applied
- **WHEN** the server responds with success (no `reason`/`alreadyCompleted: true`)
- **THEN** the corresponding `mutations` row is removed from the local queue

#### Scenario: A `recorded: 0` response with no failure reason is still a success

- **GIVEN** a pending `session-answer` mutation's answer(s) were already applied via a different channel (e.g. `sendBeacon` succeeded before this queued replay ran)
- **WHEN** replay submits it and the server responds `{ data: { recorded: 0 } }` with no `reason` field
- **THEN** the corresponding `mutations` row is removed from the local queue as an ordinary success — it is NOT left `pending` (which would strand it, since `recorded` can never become greater than zero on a future retry) and NOT marked `failed`

### Requirement: Replay Triggers on Every Realistic Reconnect Scenario

Replay SHALL be attempted when any of the following occur: (1) the browser fires an `online` event; (2) the tab's visibility transitions to `visible`; (3) `StudyOfflineSyncProvider` mounts and `navigator.onLine` is already `true` with pending mutations present (covering the case where the app was closed while offline and reopened later already-connected, which the first two triggers — both requiring a state _transition_ — do not cover); (4) the user activates a manual "Sync now" control. Concurrent replay attempts from multiple tabs of the same origin SHALL be serialized via the Web Locks API (`navigator.locks`) where available; where unavailable, replay proceeds without the lock as an accepted degraded case (server-side per-mutation dedupe still prevents double-application).

**Constraint**: MUST
**Verification**: Unit test for each of the 4 trigger conditions, including a test that mounts the provider in an already-`online` state with pre-existing pending rows and asserts replay is attempted without requiring an `online`/`visibilitychange` event first; unit test (where Web Locks is mockable) asserting two simultaneous replay calls do not both proceed unlocked

#### Scenario: Replay triggers on reconnect and on tab visibility

- **GIVEN** pending mutations exist in the queue
- **WHEN** the browser fires an `online` event, or the tab transitions to visible, or the user activates "Sync now"
- **THEN** a replay attempt is triggered

#### Scenario: Replay triggers on mount when already online

- **GIVEN** pending mutations were queued during a prior offline session, and the app was fully closed
- **WHEN** the app is reopened later while the device is already connected to the network
- **THEN** a replay attempt is triggered on mount, without waiting for an `online` or `visibilitychange` event

#### Scenario: Cross-tab replay does not race

- **GIVEN** the same account has two tabs open, both with pending mutations and both regaining connectivity at the same time
- **WHEN** both tabs' providers attempt to trigger replay simultaneously
- **THEN** the Web Locks guard ensures only one tab actively replays at a time (where Web Locks is supported)

### Requirement: Four-Way Failure Classification (Stale Reference vs. Rate Limit vs. Unauthenticated vs. Network Failure)

Replay outcome handling SHALL distinguish four cases, not two:

1. **Definitive client error (404/403 — stale or invalid reference)**: mark that row `status: 'failed'` with a reason, and continue replaying the remaining pending rows in the same run.
2. **Rate limited (HTTP 429)**: leave the row `status: 'pending'` (NOT `failed`), stop the current replay run, and schedule exactly one retry after the server-provided retry hint plus jitter, rather than immediately retrying on the next trigger. The retry hint SHALL be read from the parsed JSON response body's **`details.retryAfter`** field — the existing `ApiError` shape serializes as `{ error: <code>, message, details }`, so `retryAfter` is nested under `details` in the body, not a top-level field, and not reachable via `error.details.retryAfter` (`error` there is a string code, not an object).
3. **Unauthenticated (HTTP 401)**: leave the row `status: 'pending'` (NOT `failed`), stop the current replay run — handled identically to network-level failure below, since a 401 during replay (including one caused by a sign-out racing an in-flight replay) means the session is no longer valid, not that the mutation itself is stale or invalid.
4. **Network-level failure (still offline)**: leave the row `status: 'pending'`, stop the current replay run, and allow a later trigger to retry from the still-pending set.

A `session-answer` response body of `{ data: { recorded: 0, reason: 'session_already_completed' } }`, or a `session-complete` response body of `{ data: <session>, streak, alreadyCompleted: true }`, SHALL each be treated as neither a plain success nor a stale-reference failure: the row SHALL be marked `status: 'failed'` with that specific reason, distinguishable in the UI from other failure reasons, rather than silently deleted as if it had been applied. **This is the only case in which `recorded: 0` is a failure** — `recorded: 0` with no `reason` field (e.g. the batch's items were all already applied via a different channel) is an ordinary success per the requirement above, and MUST NOT be confused with this reason-carrying variant. Similarly, `alreadyCompleted: true` means "a request _other than this replayed one_ already completed the session" — a `session-complete` replay whose own completion-level `clientMutationId` was already recorded (this exact device's own completion request, repeated) returns an ordinary success with no `alreadyCompleted: true`, not this failure variant; see `offline-mutation-queue`'s completion-level dedupe requirement for why these are different.

`alreadyCompleted` SHALL be computed server-side from the completion `UPDATE`'s own affected-row count (whether _this_ request's write actually matched and changed a not-yet-completed row), not from a separate read of the session's completion state issued before that write — the latter is racy under concurrent completion attempts and could report `alreadyCompleted: false` for a request that, in fact, lost the race.

**Constraint**: MUST
**Verification**: Unit test asserting a 429 response does not mark the row `failed`, instead halts the run and schedules a backoff retry read from the response body's `details.retryAfter`; unit test asserting a 404/403 marks only that row `failed` and the run continues with subsequent rows; unit test asserting a 401 response leaves the row `pending` and halts the run (same code path as a network error, not the 404/403 path); unit test asserting a `session-answer` response body `{data: {recorded: 0, reason: 'session_already_completed'}}` and a `session-complete` response body `{data, streak, alreadyCompleted: true}` each mark their row `failed` with the corresponding reason rather than deleting it; unit test asserting a `recorded: 0` response with **no** `reason` field is treated as success, not failure; unit test asserting a `session-complete` replay of an already-applied completion-level `clientMutationId` is treated as success, not `alreadyCompleted`-failure; integration test simulating a burst of queued mutations against a rate-limited endpoint asserting none are permanently lost; integration test asserting the `PATCH /sessions/[id]` complete route branch actually forwards `alreadyCompleted` in its JSON response (not silently dropped by the route's destructure); integration test asserting `alreadyCompleted` is derived from the completion update's affected-row count, not a separate pre-write read (e.g. by simulating two concurrent completion requests and asserting exactly one gets `alreadyCompleted: false`/succeeds and the other gets `alreadyCompleted: true`)

#### Scenario: One stale mutation does not block the rest of the queue

- **GIVEN** a pending mutation references a card that has since been deleted, and other unrelated pending mutations also exist
- **WHEN** replay runs and the stale mutation's request returns a definitive client error (404/403)
- **THEN** that mutation is marked `failed` and the remaining pending mutations are still attempted in the same replay run

#### Scenario: Rate limiting is retried, not discarded

- **GIVEN** a reconnect burst causes a queued mutation's request to receive an HTTP 429 response
- **WHEN** replay processes that mutation
- **THEN** the mutation remains `status: 'pending'`, the current replay run stops, and a retry is scheduled honoring the response body's `details.retryAfter` value rather than the mutation being marked `failed`

#### Scenario: Session no longer valid mid-replay is retried, not marked failed

- **GIVEN** a replay run is in progress and the current session becomes invalid partway through (e.g. it expired, or a sign-out is racing the run)
- **WHEN** the next mutation's request returns HTTP 401
- **THEN** the replay run stops, that mutation and all mutations after it remain `status: 'pending'` (not `failed`), and a later trigger — once the user is authenticated again — retries from the still-pending set

#### Scenario: Network failure mid-replay halts without data loss

- **GIVEN** a replay run is in progress and connectivity drops again partway through
- **WHEN** the next mutation's request fails at the network level
- **THEN** the replay run stops, that mutation and all mutations after it remain `status: 'pending'`, and no queued data is deleted

#### Scenario: Already-completed session is a distinguishable outcome, not silent success

- **GIVEN** a queued `session-answer` mutation targets a session that was already completed (e.g. from another device/tab)
- **WHEN** the server responds with `{ data: { recorded: 0, reason: 'session_already_completed' } }`
- **THEN** the mutation's row is marked `failed` with that reason and surfaced distinctly in the sync-status UI, not silently removed as an ordinary success

#### Scenario: Already-completed session via a queued completion is a distinguishable outcome

- **GIVEN** a queued `session-complete` mutation targets a session that was already completed (e.g. from another device/tab)
- **WHEN** the server responds with `{ data: <session>, streak, alreadyCompleted: true }`
- **THEN** the mutation's row is marked `failed` with that reason and surfaced distinctly in the sync-status UI, not silently removed as an ordinary success

#### Scenario: Replaying an already-applied batch is success, not the completed-session failure

- **GIVEN** a queued `session-answer` mutation whose answers were already applied via a different channel before this session was later completed
- **WHEN** the server responds with `{ data: { recorded: 0 } }` and no `reason` field
- **THEN** the mutation's row is removed as an ordinary success, distinct from the `session_already_completed` scenario above (which requires a `reason` field to be present)

#### Scenario: Replaying this device's own already-applied completion is success, not the alreadyCompleted failure

- **GIVEN** a queued `session-complete` mutation's completion-level `clientMutationId` was already recorded by an earlier delivery of this exact request
- **WHEN** the server responds with an ordinary completion success and no `alreadyCompleted: true`
- **THEN** the mutation's row is removed as an ordinary success, distinct from the scenario above (a _different_ request completing the session first)

### Requirement: Sync Status Visibility, Failed-Completion Notice, and Locale Parity

While one or more `mutations` rows have `status: 'pending'` or `status: 'failed'`, the UI SHALL display a non-blocking, locale-aware indicator summarizing the pending/failed count and offer a manual "Sync now" action. A `failed` row of kind `session-complete` SHALL be surfaced with a more prominent, non-dismissible-by-accident notice (distinct from the generic pending-count badge), since it represents the loss of an entire session's completion outcome rather than a single answer. When the pending count transitions from greater than zero to zero as a result of a replay run, the UI SHALL show a brief, auto-dismissing confirmation (e.g. "✓ Synced") even if that replay happened via the mount trigger with no user-visible action beforehand. New user-visible strings for this indicator SHALL be added to the existing `messages/{vi,en,ja}/pwa.json` catalog (already registered in `CATALOG_FILES`) and MUST have vi/en/ja parity.

**Constraint**: MUST
**Verification**: Component test rendering the indicator with pending/failed counts; component test asserting a distinct notice for a `failed` `session-complete` row; component test asserting a transient confirmation appears when pending count reaches zero; locale catalog parity test for the new keys across vi/en/ja

#### Scenario: Pending count is visible

- **GIVEN** the mutation queue has 3 pending rows
- **WHEN** the study UI is rendered
- **THEN** a non-blocking indicator shows that 3 changes are pending sync, in the user's active locale

#### Scenario: Manual sync trigger

- **GIVEN** the sync-status indicator is visible with pending mutations
- **WHEN** the user activates "Sync now"
- **THEN** a replay attempt is triggered immediately, independent of the other triggers

#### Scenario: Failed session-complete notice is distinct from the generic badge

- **GIVEN** a `mutations` row of kind `session-complete` has `status: 'failed'`
- **WHEN** the study UI renders the sync-status affordance
- **THEN** a more prominent, non-dismissible-by-accident notice specific to that failed completion is shown, distinct from the generic pending/failed-count badge used for individual answers

#### Scenario: Fully-synced confirmation appears

- **GIVEN** the queue had pending mutations and a replay run (triggered by any of the 4 trigger conditions, including a silent mount-time replay) successfully drains it to zero
- **WHEN** the user next views the study UI
- **THEN** a brief, auto-dismissing "✓ Synced" confirmation is shown

#### Scenario: New sync-status strings have vi/en/ja parity

- **GIVEN** new keys are added for the sync-status indicator and failed-completion notice
- **WHEN** the vi, en, and ja catalogs are compared
- **THEN** every new key is present and resolvable in all three locales

---

## Out of Scope

- Background Sync API-driven replay while the app is fully closed (documented as a deferred future enhancement; the mount-time trigger covers the dominant real-world "reopened later, already online" case at much lower cost)
- Manual conflict-resolution UI (user picking between two conflicting versions)
- Retrying `failed` (as opposed to `pending`) rows automatically — a user MAY dismiss them, but automatic infinite retry of definitively-invalid references is not provided
- Reconciling relative ordering across two different devices' independent queues for the same account — replay order is guaranteed only **per device**; concurrent offline review of the same card on two devices before either syncs is an accepted, documented risk (see design-brief Decision 9), not resolved by this capability
