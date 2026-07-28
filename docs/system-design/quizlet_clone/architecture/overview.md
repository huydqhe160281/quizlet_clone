# i18n Architecture Overview

## 1. System Diagram

```mermaid
flowchart LR
    User[User / Browser]
    AuthMw[Existing next-auth middleware]
    LocaleMw[Locale resolve + cookie sync]
    DB[(Prisma User.preferredLocale nullable)]
    Cookie[(app-locale cookie)]
    AcceptLang[Accept-Language]
    Fallback[Fallback: vi]
    Core[i18n Core thin custom]
    Catalogs[messages/vi|en|ja]
    Switcher[LanguageSwitcher]
    PrefAPI[PATCH/GET preferences]
    App[App Router pages]

    User -->|request| AuthMw
    AuthMw -->|same request chain| LocaleMw
    LocaleMw -->|logged-in and preferredLocale set| DB
    DB -->|null preference| Cookie
    Cookie -->|missing/invalid| AcceptLang
    AcceptLang -->|unsupported| Fallback
    LocaleMw -->|x-app-locale header + cookie| Core
    Core -->|load active catalog only| Catalogs
    Core -->|t + generateMetadata| App
    User -->|select locale| Switcher
    Switcher -->|cookie + optional PATCH| PrefAPI
    PrefAPI -->|write preferredLocale| DB
```

## 2. Component Boundaries

| Boundary                        | Responsibility                                                                                                                                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **i18n Core** (`src/lib/i18n/`) | Pure locale types (`vi\|en\|ja`), `SUPPORTED_LOCALES`, `resolveLocale()`, catalog loader, `t(key)`, server `getRequestLocale()`, client `LocaleProvider`. No URL rewriting.                                                                                    |
| **Middleware composition**      | Locale logic runs **inside** the existing `src/middleware.ts` `auth((req) => …)` handler (next-auth v5). After auth redirects, resolve locale, ensure `app-locale` cookie, set request header `x-app-locale` for RSC. Do **not** add a second middleware file. |
| **Message Catalogs**            | `messages/{locale}/**/*.json` — UI chrome + system copy only. Shared `SUPPORTED_LOCALES` constant is the single source of truth.                                                                                                                               |
| **LanguageSwitcher**            | Header + settings. Writes cookie immediately; if session exists, `PATCH` preference. Prefer soft refresh (`router.refresh()`) over full reload; never mid-quiz hard reload without warning.                                                                    |
| **Preference API**              | `GET`/`PATCH /api/user/preferences` — session required; user may only mutate own row.                                                                                                                                                                          |

## 3. Data Flow

1. Request enters **next-auth middleware**; protected/auth redirects unchanged.
2. Locale resolve order: **DB `preferredLocale` if non-null → valid `app-locale` cookie → Accept-Language map → `vi`**.
3. Middleware may set/refresh `app-locale` and forwards `x-app-locale`.
4. i18n Core loads **only** `messages/{locale}` for that request.
5. Root layout reads locale via cookies/headers; `<html lang={locale}>`. SEO via **`generateMetadata()`** (not static `metadata` export).
6. UI uses `t()`; study content from APIs stays **raw** (never `t()`).
7. Switcher updates cookie (+ DB when logged in); `router.refresh()` reloads RSC tree with new catalog.

### Accept-Language mapping

| Header primary tag      | Resolved |
| ----------------------- | -------- |
| `vi` (+ `vi-*`)         | `vi`     |
| `en` (+ `en-*`)         | `en`     |
| `ja` (+ `ja-*`)         | `ja`     |
| anything else / missing | `vi`     |

Parse q-values; pick highest-q supported tag; ignore malformed values.

## 4. Key Dependencies

- Next.js 15 App Router + existing next-auth middleware.
- Prisma `User.preferredLocale Locale?` (nullable — see backend).
- **Thin custom i18n** (ADR-001) — JSON catalogs + provider; no `next-intl` required for v1.
- Existing SEO helpers (`createRootMetadata` / `site-config`) become locale-aware via `generateMetadata`.
