# Detail: Offline Study Cache, Queue & Replay

See also [architecture/offline-study-sync.md](../architecture/offline-study-sync.md).

## IndexedDB

- Database: `quizfree-study-offline`
- `sets`: compound key `[setId, userId]` → `{ sessionId, setTitle, cards, cachedAt, lastAccessedAt }`
- `mutations`: auto-increment `localId` → one row per answer / review / completion

## Replay outcomes

| Condition                                                       | Action                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| Success (no `reason` / no `alreadyCompleted: true`)             | Delete row                                                    |
| `reason: session_already_completed` or `alreadyCompleted: true` | Mark `failed`                                                 |
| 404/403                                                         | Mark `failed`, continue                                       |
| 429                                                             | Leave `pending`, halt, backoff from `body.details.retryAfter` |
| 401 / network                                                   | Leave `pending`, halt                                         |

## Auth

- Sign-out: Navbar awaits best-effort flush, then `signOut`; unauthenticated transition clears this user's `sets` only
- Sign-in: purge foreign-`userId` `sets` rows before render
