# ADR-002: Locale Persistence Strategy

## Status

Accepted (revised after Phase 3 review)

## Context

Need cross-device preference for logged-in users and stable guest sessions, with first-visit `Accept-Language` detection and final fallback `vi`.

## Decision

**Cookie + nullable DB field**, synchronized by backend rules.

### Schema

- `User.preferredLocale Locale?` — **`null` means unset** (not “Vietnamese”).
- Avoids Prisma `@default(vi)` silently wiping a guest’s `en`/`ja` cookie on first login.

### Authenticated users

| Situation                                | Action                                                   |
| ---------------------------------------- | -------------------------------------------------------- |
| `preferredLocale != null`                | DB authoritative; mirror to `app-locale` cookie          |
| `preferredLocale == null` + valid cookie | Persist cookie → DB, then continue                       |
| both missing                             | Accept-Language → `vi`; set cookie; may persist on login |

`PATCH /api/user/preferences` always sets non-null locale + cookie in the same handler.

### Guests / first visit

1. No cookie → Accept-Language map (`vi*`/`en*`/`ja*`) else `vi`.
2. Write `app-locale` for subsequent requests.

### Resolution order (every request)

1. Session and `preferredLocale != null`
2. Valid `app-locale` cookie
3. Accept-Language map
4. `vi`

## Rejected Alternatives

### Cookie-only

No cross-device sync for accounts.

### DB-only for guests

Guests have no user row.

### `preferredLocale Locale @default(vi)` (non-null)

Rejected — indistinguishable from explicit VI; overwrites guest EN/JA on login (review CF).

### Always force `vi` on first visit

Rejected — ignores useful `Accept-Language` (exploration Q4).

## Consequences

- Login handler must implement null-vs-set branching (see backend.md).
- Migration is additive nullable column — low blast radius.
- Cookie remains non-HttpOnly for client switcher; preference writes remain session-authenticated.
