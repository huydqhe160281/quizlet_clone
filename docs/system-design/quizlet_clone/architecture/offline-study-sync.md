# Offline Study Sync (Phase 2)

Builds on [Offline PWA Shell](./offline-pwa.md). `/api/**` remains **NetworkOnly** in the service worker — study durability lives in IndexedDB + server idempotency, not in Cache Storage.

## Summary

Per-user IndexedDB cache of the 5 most-recently-opened study sessions (cards + `sessionId`) plus a durable, per-mutation queue. Answers, session completions, and SRS reviews stamp a `clientMutationId` at record time, enqueue on network failure, and replay in `clientTimestamp` order (Web Locks when available) after reconnect / visibility / mount-while-online / manual Sync.

## Architecture

```text
Browser
  ├─ Study UI + useStudySession / useSubmitReview
  │     └─ stamp → online PATCH/POST; on failure → mutations queue
  ├─ IndexedDB `quizfree-study-offline`
  │     ├─ sets [setId, userId]  (LRU 5)
  │     └─ mutations (pending|failed)
  ├─ StudyOfflineSyncProvider (near PwaProvider)
  └─ Navbar: flushPendingMutationsBeforeSignOut before signOut

Server
  ├─ ProcessedMutation @@unique([clientMutationId, userId])
  ├─ Batch answers: findMany → filter → createMany(skipDuplicates)
  └─ Review / completion claim: create inside $transaction; P2002 caught outside
```

## Key files

| Path                                          | Role                                          |
| --------------------------------------------- | --------------------------------------------- |
| `src/features/study-offline/*`                | DB, cache, queue, replay, provider, sync UI   |
| `src/features/study/hooks/useStudySession.ts` | Cache upsert, offline resume, enqueue/requeue |
| `src/server/services/study/study.service.ts`  | Idempotent batch + review + complete          |
| `prisma/schema.prisma`                        | `ProcessedMutation`                           |

## Non-goals

- Caching API JSON in the service worker
- Cross-device offline merge (accepted single-device order risk)
- Push / Background Sync API
