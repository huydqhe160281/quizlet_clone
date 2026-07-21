# Specification: locale-persistence

<!--
  Metadata: version 1.0, status: Draft
  Source: i18n-multilingual-vi-en-ja design-brief.md + decomposition.md
-->

## Capability Summary

Persist and synchronize the user's active locale using a client-readable `app-locale` cookie for guests and a nullable `User.preferredLocale` column for authenticated users, with authoritative login-time sync.

## Engine Layer Map

| Layer     | Crate         | Component/Symbol                                         |
| --------- | ------------- | -------------------------------------------------------- |
| Core      | `core`        | `Locale` enum, cookie name constants, validation helpers |
| Daemon    | `daemon`      | `GET`/`PATCH /api/user/preferences` Route Handler        |
| Agent     | `sub-agent`   | `login-sync` auth event handler                          |
| Interface | `mcp-backend` | `LanguageSwitcher` component                             |

_(Mapped to Next.js layers: Prisma schema as core, `src/app/api/user/preferences/route.ts` as daemon, `src/lib/auth/login-sync.ts` as agent, `src/components/i18n/LanguageSwitcher.tsx` as interface.)_

## ADDED Requirements

### Requirement: Prisma schema supports nullable locale preference

The system SHALL add a `Locale` enum (`vi`, `en`, `ja`) and a nullable `User.preferredLocale Locale?` column in `prisma/schema.prisma`.
**Constraint**: MUST
**Verification**: integration test `prisma.schema.test()` and migration smoke test

#### Scenario: Existing users remain null

- **GIVEN** a database with users before the migration
- **WHEN** the additive migration is applied
- **THEN** all existing rows have `preferredLocale = null`

#### Scenario: New explicit Vietnamese stored distinctly

- **GIVEN** a user who explicitly chooses Vietnamese
- **WHEN** the system writes `User.preferredLocale = 'vi'`
- **THEN** it differs from `null` (no preference) for login-time precedence

---

### Requirement: Cookie contract

The system SHALL set `app-locale` with values `vi | en | ja`, `SameSite=Lax`, `Path=/`, non-HttpOnly, `Secure` in production, and ~1 year `Max-Age`.
**Constraint**: MUST
**Verification**: unit test `cookies.test()`

#### Scenario: Set valid locale cookie

- **GIVEN** a response and `locale = 'ja'`
- **WHEN** `setLocaleCookie(res, 'ja')` is called
- **THEN** the `Set-Cookie` header contains `app-locale=ja; Path=/; SameSite=Lax; Max-Age=31536000` and omits `HttpOnly`

#### Scenario: Refuse invalid locale cookie

- **GIVEN** a request with `app-locale=fr`
- **WHEN** `getLocaleCookie(req)` validates it
- **THEN** it returns `undefined` so resolution can fall back

---

### Requirement: Preference API

The system SHALL expose session-scoped `GET` and `PATCH /api/user/preferences` where `GET` returns `{ preferredLocale: Locale | null }` and `PATCH` updates the authenticated user's own row, sets the cookie, and rejects mismatched `Origin`.
**Constraint**: MUST
**Verification**: integration test `src/app/api/user/preferences/__tests__/route.test.ts`

#### Scenario: Read own preference

- **GIVEN** a logged-in user with `preferredLocale = 'en'`
- **WHEN** `GET /api/user/preferences` is called with a valid session
- **THEN** it returns `200` with `{ preferredLocale: 'en' }`

#### Scenario: Update preference and cookie

- **GIVEN** a logged-in user with `preferredLocale = null`
- **WHEN** `PATCH /api/user/preferences` is called with body `{ preferredLocale: 'ja' }`
- **THEN** it updates the row to `'ja'`, sets the `app-locale=ja` cookie, and returns `200`

#### Scenario: Reject cross-origin PATCH

- **GIVEN** a `PATCH /api/user/preferences` request with `Origin` not matching the site origin
- **WHEN** the Route Handler validates the request
- **THEN** it returns `403` without writing the database

#### Scenario: Reject unauthenticated PATCH

- **GIVEN** no valid session
- **WHEN** `PATCH /api/user/preferences` is called
- **THEN** it returns `401`

---

### Requirement: Login-time preference sync

The system SHALL apply authoritative sync rules at sign-in: DB non-null wins; else valid guest cookie is persisted; else resolve `Accept-Language` → `vi` and set the cookie (optionally persisted on first login).
**Constraint**: MUST
**Verification**: integration test `src/lib/auth/__tests__/login-sync.test.ts`

#### Scenario: DB preference wins over guest cookie

- **GIVEN** `User.preferredLocale = 'ja'` and `app-locale=en` cookie present
- **WHEN** the user signs in
- **THEN** the cookie is refreshed to `'ja'` and DB remains `'ja'`

#### Scenario: Guest cookie survives login when DB is null

- **GIVEN** `User.preferredLocale = null` and `app-locale=en` cookie present
- **WHEN** the user signs in
- **THEN** the DB is updated to `'en'` and the cookie remains `'en'`

#### Scenario: First login with no preference uses Accept-Language

- **GIVEN** `User.preferredLocale = null`, no cookie, and `Accept-Language: en-US,en;q=0.9`
- **WHEN** the user signs in
- **THEN** the cookie is set to `'en'` and the DB is updated to `'en'`

#### Scenario: First login with unsupported Accept-Language defaults to Vietnamese

- **GIVEN** `User.preferredLocale = null`, no cookie, and `Accept-Language: es-ES,es;q=0.9`
- **WHEN** the user signs in
- **THEN** the cookie is set to `'vi'` and the DB is updated to `'vi'`

---

### Requirement: Language switcher persistence

The system SHALL provide a keyboard-accessible `LanguageSwitcher` that writes the `app-locale` cookie immediately and calls `PATCH /api/user/preferences` when a session exists, then applies the locale via soft refresh.
**Constraint**: MUST
**Verification**: component test `LanguageSwitcher.test.tsx`

#### Scenario: Logged-in user switches language

- **GIVEN** a signed-in user viewing a page with `locale = 'vi'`
- **WHEN** the user selects Japanese in the switcher
- **THEN** it calls `PATCH` with `'ja'`, updates the cookie, and refreshes the page

#### Scenario: Guest switches language

- **GIVEN** a guest viewing a page with `locale = 'vi'`
- **WHEN** the user selects English in the switcher
- **THEN** it sets `app-locale=en` without calling the API and refreshes the page

#### Scenario: Keyboard accessible

- **GIVEN** the switcher is focused
- **WHEN** the user presses Enter or Space on a language option
- **THEN** the locale changes and focus remains visible

---

## Out of Scope

- Rate limiting on `PATCH /api/user/preferences` (optional polish).
- Multi-tab realtime synchronization of locale.
- Persisting locale per study set or content item.
- Non-session auth flows (magic link, OAuth locale handled via same login-sync hook).
- Confirmation dialog for soft refresh during study (v1 soft-refreshes immediately; confirmation applies only if a hard reload is required).
