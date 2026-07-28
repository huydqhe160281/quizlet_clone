# Backend Architecture: Multilingual (vi / en / ja)

## Data Model

```prisma
enum Locale {
  vi
  en
  ja
}

model User {
  // ... existing fields ...
  preferredLocale Locale?  // null = never explicitly saved
}
```

- **Nullable** `preferredLocale` distinguishes “no preference” from “chose Vietnamese”.
- Migration: add enum + nullable column; no backfill required (all existing users = `null`).
- Sequence after next-auth tables; rollback = drop column + enum.
- No extra index required for v1 (low-cardinality preference read on already-keyed user).

## Middleware Composition

Extend **existing** `src/middleware.ts` (next-auth `auth()` wrapper):

1. Keep protected-prefix and auth-page redirects as today.
2. Before `return undefined` / after redirect checks: resolve locale (see order below).
3. Build `NextResponse.next()` (when not redirecting), set `app-locale` if missing/invalid, set request header `x-app-locale`.
4. Matcher stays as today (locale also needed on public pages); API routes excluded by matcher — Route Handlers resolve locale via cookie/session helpers directly.

Do not introduce a parallel middleware export.

## API

### `GET /api/user/preferences`

- `requireSession()` — 401 if unauthenticated.
- Returns `{ "preferredLocale": "en" | "vi" | "ja" | null }`.

### `PATCH /api/user/preferences`

- `requireSession()`; body `{ preferredLocale: "vi"|"en"|"ja" }` — 400 if invalid.
- Authz: `session.user.id` only (no userId in body).
- CSRF posture: relies on **same-site session cookie** + `SameSite=Lax` on `app-locale`; no cross-site form posts expected. Document this; reject if `Origin` mismatches when present.
- On success: write `preferredLocale`, set `app-locale` cookie, return 200.

## Cookie Contract

| Attribute | Value                                        |
| --------- | -------------------------------------------- |
| Name      | `app-locale`                                 |
| Values    | `vi` \| `en` \| `ja`                         |
| SameSite  | `Lax`                                        |
| Path      | `/`                                          |
| HttpOnly  | `false` (client LanguageSwitcher / provider) |
| Secure    | `true` in production                         |
| Max-Age   | ~1 year                                      |

## Login Sync (authoritative rules)

1. If `User.preferredLocale != null` → set cookie from DB (DB wins).
2. Else if valid `app-locale` cookie → **persist cookie into** `User.preferredLocale` (guest EN/JA choice not overwritten by implicit `vi`).
3. Else → resolve Accept-Language → `vi`; set cookie; optionally persist to DB on first login.
4. Cookie and DB writes for preference changes should happen in the same request handler; on DB write failure, do not claim success / do not leave cookie ahead of DB without retry.

Two-tab last-write-wins on `PATCH` is acceptable; no realtime sync required for v1.

## Locale Resolution Order

1. Session + `preferredLocale != null` → that value.
2. Valid `app-locale` cookie.
3. `Accept-Language` map (`vi*`/`en*`/`ja*` → code; else `vi`).
4. `vi`.

## Server-Localized Content

Localized via server catalogs + `getRequestLocale()`:

- API user-facing errors.
- Auth emails.
- Guide/assistant **prompts at request time** from `messages/{locale}/guide.json` (or shared catalog keys).

### Guide-config (build-time vs runtime)

- Current `scripts/generate-guide-config.mjs` emits build-time JSON with hardcoded `locale: 'vi'`.
- **Decision:** runtime locale wins — guide/assistant reads catalog for active request locale. Build script may still emit structure defaults, but must not freeze user-facing locale copy to `vi` only. Prefer pre-bake `messages/{vi,en,ja}/guide.json` checked into repo over regenerating per deploy language.

## Study Content

Unchanged — endpoints return author language; no server translation.
