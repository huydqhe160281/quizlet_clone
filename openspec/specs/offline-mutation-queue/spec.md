# Specification: Offline Mutation Queue

<!--
  Metadata: version 1.3, status: Draft (revised after 3 rounds of 4-perspective review)
  Guidance: Define requirements and verification criteria using engine layers and Gherkin scenarios.
-->

## Purpose

Durably capture answer/review writes that fail to reach the server (offline or transient network failure) in a local IndexedDB queue, at per-mutation granularity, with an idempotency key generated at the moment the user acts — not at the moment a network call happens to fail — so any delivery channel (direct request, `sendBeacon`, or later replay) can carry the same key safely.

## Capability Summary

Every individual answer and review action is stamped with a `clientMutationId` when the user performs it; if delivery fails, that single mutation is durably queued; the server dedupes by `[clientMutationId, userId]` so redundant delivery (across channels or retries) never double-applies, and never collides across different users.

## Engine Layer Map

| Layer     | Area        | Component/Symbol                                                                                                                                                                                                                                 |
| --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Interface | Storage     | `src/features/study-offline/db.ts` (`mutations` store, per-mutation rows, `userId` index)                                                                                                                                                        |
| Interface | Enqueue     | `src/features/study-offline/queue.ts` (`enqueueMutation`, `getPendingMutations(userId)`)                                                                                                                                                         |
| Interface | ID stamping | `store.ts` (`addPendingAnswer` mints new IDs for new answers; `requeuePendingAnswers` preserves existing IDs when re-buffering after a failed send), `useSpacedRepetition.ts` (`useSubmitReview`) — ID generated once, at record time            |
| Interface | Call sites  | `useStudySession.ts` (round flush, completion, unmount cleanup, `completeSession` callback), `SpacedRepetitionStudy.tsx` (5 call sites)                                                                                                          |
| Interface | API         | `PATCH /api/v1/study/sessions/[sessionId]` (per-answer-item `clientMutationId` on both branches, plus a distinct completion-level `clientMutationId` on the completion branch), `POST /api/v1/study/review` (`clientMutationId`, UUID-validated) |
| Core      | Persistence | Prisma `ProcessedMutation` model, unique on `[clientMutationId, userId]`, cascade-deletes with `User`                                                                                                                                            |

---

## Requirements

### Requirement: Idempotency Key Generated at Record Time

Every individual answer buffered via `addPendingAnswer` and every individual spaced-repetition review submitted via `useSubmitReview` SHALL be stamped with a `clientMutationId` (a UUID) and a `clientTimestamp` at the moment the user performs the action — not later, and not only when a subsequent network request fails. This identifier SHALL be included on every attempt to deliver that mutation, whether via the immediate online request, a `sendBeacon` fallback, or a later durable-queue replay, so that redundant delivery across those channels is dedupable server-side. **This identifier SHALL be stamped exactly once per answer/review and MUST NOT be regenerated on any subsequent re-buffer of that same answer/review** — e.g. when a round-flush or completion request fails and the answer is put back into `pendingAnswers` for a later retry, the re-buffer SHALL reuse the `clientMutationId`/`clientTimestamp` that were already stamped on it, via a distinct action (`requeuePendingAnswers`) that never mints a new ID, rather than calling `addPendingAnswer` again (which mints a new ID and would silently defeat the idempotency guarantee this requirement exists to provide). `requeuePendingAnswers` applies to every call site that re-buffers an already-stamped answer into a **still-live** in-memory store — the round-flush catch block, the completion-effect catch block, the exported `completeSession` callback catch, **and** the durable-queue write's own IndexedDB-unavailable fallback for `session-answer` kinds — not the unmount cleanup catch (store already reset).

**A session-completion event SHALL likewise mint its completion-level `clientMutationId` exactly once per session-completion lifecycle** (the first time that `sessionId` begins a completion attempt), preserve it across retries (including after `completionSentRef` is reset to allow another attempt), and include that same ID on every online PATCH body and every `session-complete` queue payload for that session. It MUST NOT mint a fresh ID inside each `persistSessionCompletion` invocation.

**`requeuePendingAnswers` SHALL prepend the restored answers ahead of whatever is currently in `pendingAnswers`, not append them.** Because the round-flush clears `pendingAnswers` before attempting the network send, new answers recorded while that send is still in flight land in the (now-empty) store; if the send then fails, appending the restored, chronologically-earlier snapshot after those newer answers would invert temporal order for any card answered again during that window, causing cardId-collapsing dedupe (in `offline-mutation-queue`'s server-side sibling requirement) to keep the wrong (older) grade as if it were the latest.

**Constraint**: MUST
**Verification**: Unit test asserting `addPendingAnswer` and `useSubmitReview` attach a UUID `clientMutationId` and numeric `clientTimestamp` at call time, before any network attempt occurs; unit test asserting that re-buffering an answer after a failed round-flush or completion attempt (via `requeuePendingAnswers`) preserves the exact same `clientMutationId` it already had, across at least 2 consecutive failed attempts; unit test asserting `requeuePendingAnswers` prepends its argument ahead of any answers already present in `pendingAnswers`, verified by asserting resulting array order and by asserting a same-`cardId` collapse afterward keeps the newer (not the requeued/older) `isCorrect`

#### Scenario: Answer is stamped when recorded, not when it fails

- **GIVEN** a user answers a card during a study round
- **WHEN** `addPendingAnswer` is called
- **THEN** the buffered answer already carries a `clientMutationId` and `clientTimestamp`, independent of whether the subsequent network flush succeeds or fails

#### Scenario: Re-buffered answer keeps its original clientMutationId

- **GIVEN** an answer was already stamped with `clientMutationId = X` when first recorded
- **WHEN** its round-flush (or completion) request fails and the answer is put back into `pendingAnswers` via `requeuePendingAnswers`, and this happens across two consecutive failed attempts
- **THEN** the answer still carries `clientMutationId = X` after both re-buffers — never a newly-minted ID — so every eventual delivery attempt (queue, beacon, retried flush) is recognized server-side as the same mutation

#### Scenario: Requeued answers are prepended, preserving chronological order

- **GIVEN** an answer for `cardId = A` (marked correct) was stamped and is mid-flight in a round-flush request whose `pendingAnswers` snapshot has since been cleared
- **AND** while that request is in flight, the user answers `cardId = A` again (marked incorrect), landing in the now-empty `pendingAnswers`
- **WHEN** the in-flight request fails and its snapshot is restored via `requeuePendingAnswers`
- **THEN** the restored (correct, older) answer for `cardId = A` is placed **before** the newer (incorrect) one in `pendingAnswers`, so a subsequent same-`cardId` collapse keeps the newer, incorrect grade as the latest

#### Scenario: Completion-level clientMutationId is stable across retries

- **GIVEN** a session begins its first completion attempt and is stamped with completion-level `clientMutationId = Z`
- **WHEN** that attempt fails (network), is enqueued under `Z`, the client resets its "already sent" guard, and a later retry of `persistSessionCompletion` for the same session succeeds online
- **THEN** both the queued payload and the successful online body carry `clientMutationId = Z` — never a newly-minted ID — so a later replay of the queued row is recognized as this device's own completion

#### Scenario: Review is stamped when submitted

- **GIVEN** a user grades a due card in `SpacedRepetitionStudy`
- **WHEN** `useSubmitReview` is invoked
- **THEN** the review request carries a `clientMutationId` and `clientTimestamp` generated for that specific grading action

### Requirement: Durable Local Mutation Queue at Per-Mutation Granularity

When an individual answer, a session completion, or a spaced-repetition review fails to reach the server due to a network-level error (the request could not reach the server, as distinct from a server-side response), the system SHALL persist that **single** mutation's payload and its previously-stamped `clientMutationId`/`clientTimestamp` into a local IndexedDB `mutations` store with `status: 'pending'`, in addition to attempting the request over the network first. A round-flush batch containing multiple answers SHALL, on failure, be fanned out into one queue row **per answer** — never one row representing the whole batch — so that a later stale reference affecting one answer cannot cause every other answer in that batch to be treated as failed. Enqueued mutations SHALL survive a page refresh or the tab being closed and reopened. If the durable queue write itself fails (e.g. IndexedDB unavailable/quota exceeded), the system SHALL catch that failure and apply a **kind-aware** fallback: for `session-answer`, fall back to the in-memory `requeuePendingAnswers` path (preserving the already-stamped `clientMutationId`/`clientTimestamp`), not `addPendingAnswer`; for `srs-review` / `session-complete`, log the failure and leave that mutation as lost for this attempt (there is no equivalent stamped in-memory store) — never throw into the calling hook.

**Constraint**: MUST
**Verification**: Unit test simulating a network failure on a multi-answer round flush asserting N separate `mutations` rows are created, each with its own previously-stamped `clientMutationId`; unit test asserting queue contents persist across a simulated store re-initialization; unit test simulating an IndexedDB write failure for a `session-answer` asserting the calling hook does not throw, falls back to `requeuePendingAnswers`, and preserves the original `clientMutationId`; unit test simulating an IndexedDB write failure for an `srs-review` asserting log-and-drop (no invented in-memory channel, no throw)

#### Scenario: A multi-answer round flush enqueues one row per answer

- **GIVEN** an in-progress study round with 3 unsent answers
- **WHEN** the round-flush `PATCH` request fails because the network is unavailable
- **THEN** 3 separate `mutations` rows are created (kind `session-answer`), each carrying the `clientMutationId` that was already stamped when that specific answer was recorded

#### Scenario: Session completion enqueues on network failure

- **GIVEN** a study session that has just finished (via the completion effect, the unmount cleanup path, or the exported `completeSession` callback)
- **WHEN** the completion `PATCH` request fails because the network is unavailable
- **THEN** one `mutations` row of kind `session-complete` is created (carrying the stable completion-level `clientMutationId`), **and** one `session-answer` row is created per still-unsent answer in that request, each carrying its already-stamped `clientMutationId`

#### Scenario: SRS review enqueues on network failure

- **GIVEN** a due card is graded at any of the grading call sites in `SpacedRepetitionStudy`
- **WHEN** `POST /api/v1/study/review` fails because the network is unavailable
- **THEN** a `mutations` row of kind `srs-review` is created carrying the review's previously-stamped `clientMutationId`, and the calling handler does not throw (the round/UI continues as if the review had briefly succeeded)

#### Scenario: Queue survives refresh

- **GIVEN** one or more `mutations` rows are queued with `status: 'pending'`
- **WHEN** the page is refreshed or the tab is closed and reopened
- **THEN** those rows are still present and readable on the next load

#### Scenario: IndexedDB unavailability degrades gracefully without regenerating the mutation ID

- **GIVEN** IndexedDB writes are unavailable in the current browsing context
- **WHEN** an already-stamped `session-answer` fails to reach the server and the durable-queue write itself also fails
- **THEN** the system falls back to `requeuePendingAnswers` (not `addPendingAnswer`), preserving the original `clientMutationId`, instead of throwing an unhandled error or minting a new ID

#### Scenario: IndexedDB unavailability for a review logs and drops (no invented channel)

- **GIVEN** IndexedDB writes are unavailable in the current browsing context
- **WHEN** an already-stamped `srs-review` (or `session-complete`) fails to reach the server and the durable-queue write itself also fails
- **THEN** the system logs the storage failure and does not invent an in-memory requeue channel for that kind, and does not throw into the calling hook

### Requirement: Idempotent, User-Scoped Mutation Submission

The `PATCH /api/v1/study/sessions/[sessionId]` (per answer item, on both its batch-answers and its completion branches) and `POST /api/v1/study/review` endpoints SHALL accept an optional `clientMutationId`, validated server-side as a UUID; the completion branch SHALL additionally accept its own, distinct completion-level `clientMutationId`. When present, the endpoint SHALL check-and-record each ID against a server-side `ProcessedMutation` ledger — uniquely keyed by **`[clientMutationId, userId]`**, not by `clientMutationId` alone — within the same transaction that applies the mutation's effect. If a `[clientMutationId, userId]` pair has already been recorded, the endpoint SHALL short-circuit that specific mutation — returning success without re-applying it — while any other items in the same request (e.g. other answers in a batch) SHALL still be applied normally. Because the ledger key includes `userId`, two different users' clients SHALL NEVER collide on the same `clientMutationId` value. Requests without a `clientMutationId` SHALL behave exactly as before this change (no dedupe check, full backward compatibility).

**For `PATCH /sessions/[sessionId]`'s batch answers, and identically for `completeSession`'s own bundled `answers[]`, the per-item dedupe SHALL NOT be implemented as a per-item `create`-and-catch inside a single database transaction.** Against Postgres (this application's target), a unique-constraint violation on any one statement inside an interactive transaction aborts that entire transaction — every subsequent statement fails, including ones for otherwise-valid, non-duplicate items — so "catch the duplicate and keep processing the rest of the batch in the same transaction" cannot work as a per-item try/catch. Instead, within the existing transaction: (1) read all already-processed `[clientMutationId, userId]` pairs among the raw incoming items in a single query; (2) filter the raw items down to the survivors (not found, or carrying no `clientMutationId` at all); (3) if any survivors remain, insert their ledger rows in one batched, non-aborting write (e.g. `createMany` with duplicate-skipping semantics) and pass only the survivors into the existing, unmodified cardId-collapsing step. This ordering — read-filter-batch-write — SHALL run **before** any existing already-completed short-circuit for that endpoint (see the reordering requirement below), and SHALL run against the **raw incoming answer items, before** the existing `dedupeAnswers` cardId-collapsing step (which keeps only the latest `isCorrect` per `cardId` and does not carry `clientMutationId` through).

**The pre-existing "session already completed" short-circuit in the batch-answers path SHALL run _after_ the per-item ID-dedupe filter, not before it.** If every incoming item in this request was already processed (the filtered survivor set is empty), the endpoint SHALL return an ordinary success indicating nothing new was applied, regardless of whether the session has since been completed — this is a redundant, already-satisfied delivery, not a failure. The "session already completed" outcome SHALL only be returned when the survivor set is **non-empty** (there is at least one genuinely new answer) **and** the session's completion state blocks applying it.

**`completeSession` SHALL additionally claim its own, single completion-level `clientMutationId`, as a distinct check from the per-item dedupe on its bundled `answers[]` above.** This SHALL be an atomic claim using the same outer-catch / non-aborting-claim pattern as `/review` (never catch-`P2002`-inside the interactive `$transaction` callback). On a unique-constraint miss handled outside the transaction: re-read the current session row, return an ordinary success with `alreadyCompleted: false` and `streak` omitted, and SHALL NOT call `recordStreakForStudy`. Only when that create succeeds (this request freshly claimed the ID) — or the field is absent for backward compatibility — may the transaction proceed to answers-apply and the completion write; if that write then reports that a _different_ request already closed the session, the endpoint reports the distinguishable `alreadyCompleted` outcome (see `offline-sync-replay`). The endpoint MUST NOT implement this as a separate existence pre-read followed by recording the ledger row only after the completion succeeds.

For `POST /study/review`, the dedupe check SHALL be the first statement in a transaction that also contains the `CardProgress` upsert and the `ReviewHistory.create`. A unique-constraint violation SHALL be handled **outside** the `$transaction` call (the create throws → Prisma rolls back → outer catch returns `{ applied: false }`), or via a non-aborting claim (`createMany`+`skipDuplicates` + `count === 0`) — catching `P2002` inside the interactive-transaction callback and returning normally is forbidden (Postgres `25P02` abort). The `recordReviewStats` call SHALL NOT be nested inside that transaction — instead, it SHALL be invoked sequentially, after the transaction resolves, **only when the transaction's result indicates a fresh apply, not a dedupe short-circuit**. A duplicate delivery MUST leave the user's recorded review stats unchanged, not just their SRS state — satisfied by this conditional call, not by literal transactional inclusion.

**Constraint**: MUST
**Verification**: Integration test sending the same `clientMutationId` twice (same user) to `POST /study/review` and asserting only one `ReviewHistory` row results **and** that `recordReviewStats`/its downstream stat is not incremented a second time; integration test sending the same literal `clientMutationId` string from two different users and asserting both are applied independently (no cross-user collision); integration test asserting one already-processed answer within a multi-answer batch is skipped (its `clientMutationId` recognized pre-collapse) while the rest of the batch still applies via the unmodified `dedupeAnswers`; integration test asserting a batch where item 2 of 3 is a duplicate does not fail items 1 and 3 (guards against the rejected per-item-catch-in-transaction design); integration test asserting a batch where _every_ item is already processed returns an ordinary success (not the session-already-completed reason) even if the session has since been completed; integration test asserting the same completion-level `clientMutationId` submitted twice returns an ordinary success both times **and** that `recordStreakForStudy` is not invoked on the second call; integration test asserting two concurrent same-ID completions both return ordinary success; regression test asserting omitting `clientMutationId` preserves current behavior; test asserting a malformed (non-UUID) `clientMutationId` is rejected; test asserting a `P2002` on the single-item claim is handled outside `$transaction` (no commit-of-aborted-txn failure)

#### Scenario: Duplicate review submission is deduped for the same user

- **GIVEN** a `POST /api/v1/study/review` request with `clientMutationId = X` from user A has already been applied
- **WHEN** another request with the same `clientMutationId = X` and the same `{cardId, grade}` is submitted by user A again
- **THEN** the server returns success without creating a second `ReviewHistory` row, without re-applying the SRS state update, and without incrementing the user's review stats a second time

#### Scenario: Identical clientMutationId from two different users does not collide

- **GIVEN** user A has already had a mutation with `clientMutationId = X` processed
- **WHEN** user B submits a different mutation that happens to also carry `clientMutationId = X`
- **THEN** user B's mutation is applied normally — it is not short-circuited by user A's unrelated, differently-scoped ledger entry

#### Scenario: Partial batch dedupe does not abort the surrounding transaction for the other items

- **GIVEN** a `PATCH /sessions/[id]` request contains 3 answers, the middle one (`clientMutationId = Y`) already applied in an earlier request, the other two fresh
- **WHEN** the batch is submitted again
- **THEN** the answer with `clientMutationId = Y` is skipped while the other 2 answers are applied normally — the middle item's already-processed status does not cause the third item's write to fail

#### Scenario: A fully-deduped batch is a success, not a session-already-completed failure

- **GIVEN** a `PATCH /sessions/[id]` request's every answer was already applied in an earlier delivery (e.g. via `sendBeacon`), and the session has since been completed
- **WHEN** the batch is submitted again (e.g. via queue replay)
- **THEN** the response indicates an ordinary success with nothing new applied — it does NOT carry the "session already completed" reason, because there was nothing new for that state to have blocked

#### Scenario: Repeating a session's own completion request is an ordinary success

- **GIVEN** a `session-complete` mutation with completion-level `clientMutationId = Z` was already applied
- **WHEN** the same mutation (same `clientMutationId = Z`) is submitted again
- **THEN** the response is an ordinary completion success, not the "already completed by a different request" outcome, **and** `recordStreakForStudy` is not invoked a second time

#### Scenario: Concurrent same-ID completion deliveries both succeed ordinarily

- **GIVEN** two concurrent `session-complete` requests carry the identical completion-level `clientMutationId = Z` (e.g. beacon and queue race)
- **WHEN** both are processed against an open session
- **THEN** exactly one claim wins the ledger insert and performs (or attempts) the completion write, and both responses are ordinary success — neither response carries `alreadyCompleted: true`

#### Scenario: Legacy requests without clientMutationId are unaffected

- **GIVEN** a request to either endpoint omits `clientMutationId`
- **WHEN** the request is processed
- **THEN** it is applied exactly as it was before this change, with no dedupe check performed

### Requirement: Mutation Queue Survives Sign-Out

On sign-out, `mutations` rows for the signing-out user SHALL NOT be deleted, regardless of whether they are `pending` or `failed`. If the client is online, the system SHALL attempt one best-effort replay of pending mutations (bounded by a short timeout) **before invoking the sign-out call itself** — not after, and not reactively to an already-changed auth state — since the study endpoints require an authenticated session and that session is no longer valid once sign-out has completed. The system SHALL proceed with sign-out whether or not that attempt fully drains the queue.

**Constraint**: MUST
**Verification**: Unit test asserting sign-out does not delete `mutations` rows; unit test asserting the best-effort replay attempt, when online, completes (or times out) _before_ the sign-out call is invoked, using a still-valid session, and that sign-out is not blocked if mutations remain pending afterward

#### Scenario: Pending mutations survive sign-out

- **GIVEN** a user has pending, unsynced mutations queued
- **WHEN** they sign out (with or without a successful best-effort flush)
- **THEN** those `mutations` rows still exist afterward, scoped to that user's `userId`, ready to replay the next time that user is signed in on this device

---

## Out of Scope

- Full CRUD (create/edit set or card) mutation queuing — only `session-answer`, `session-complete`, and `srs-review` kinds are covered
- Automatic pruning/TTL of old `ProcessedMutation` rows (an age index is added now so a future job needs no new migration, but the job itself is deferred)
- Conflict resolution UI for mutations that ultimately fail (see `offline-sync-replay` for failure handling)
- Reconciling relative ordering of mutations queued on two different devices for the same account (see `offline-sync-replay`'s accepted-risk documentation)
