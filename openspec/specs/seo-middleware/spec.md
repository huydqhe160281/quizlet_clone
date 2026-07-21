# Specification: seo-middleware

<!--
  Metadata: version 1.0, status: Draft
  Source: openspec/changes/i18n-multilingual-vi-en-ja/design-brief.md
-->

## Capability Summary

SEO and request-level locale composition: the existing next-auth middleware resolves the active locale, refreshes the `app-locale` cookie, injects `x-app-locale`, and server-rendered metadata reflects the locale in `html lang`, page title/description, and `og:locale`.

## Engine Layer Map

| Layer     | Crate               | Component/Symbol                                      |
| --------- | ------------------- | ----------------------------------------------------- |
| Core      | `src/lib/i18n`      | `resolveLocale()`, `APP_LOCALE_COOKIE`, `ogLocaleMap` |
| Daemon    | `src/middleware.ts` | next-auth `auth()` wrapper + locale injection         |
| Agent     | `src/lib/seo`       | `createRootMetadata()`, `createPageMetadata()`        |
| Interface | `mcp-backend`       | RSC `generateMetadata()` + `RootLayout`               |

---

## ADDED Requirements

### Requirement: Locale resolves inside existing middleware

The system SHALL run locale resolution inside the existing `src/middleware.ts` next-auth handler without adding a second middleware.
**Constraint**: MUST
**Verification**: Middleware unit/integration test; `pnpm build`

#### Scenario: Authenticated user with DB preference

- **GIVEN** a logged-in user with `preferredLocale="ja"` and an invalid `app-locale` cookie
- **WHEN** a matched request passes through middleware
- **THEN** the resolved locale is `"ja"`
- **AND** the response refreshes `app-locale=ja`
- **AND** `x-app-locale: ja` is present on the forwarded request

#### Scenario: Guest with valid cookie

- **GIVEN** a guest with `app-locale=en`
- **WHEN** a matched request passes through middleware
- **THEN** the resolved locale is `"en"`
- **AND** `x-app-locale: en` is present

#### Scenario: Guest without cookie falls back to Accept-Language

- **GIVEN** a guest with no `app-locale` cookie and `Accept-Language: ja-JP,ja;q=0.9,en;q=0.8`
- **WHEN** a matched request passes through middleware
- **THEN** the resolved locale is `"ja"`
- **AND** the cookie is set to `ja`

#### Scenario: Unsupported Accept-Language falls back to Vietnamese

- **GIVEN** a guest with no cookie and `Accept-Language: de-DE,de;q=0.9`
- **WHEN** a matched request passes through middleware
- **THEN** the resolved locale is `"vi"`
- **AND** the cookie is set to `vi`

#### Scenario: Missing DB preference preserves guest cookie

- **GIVEN** a logged-in user with `preferredLocale=null` and `app-locale=en`
- **WHEN** a matched request passes through middleware
- **THEN** the resolved locale is `"en"`
- **AND** the cookie is refreshed

---

### Requirement: Middleware does not break auth redirects

The system SHALL preserve all existing next-auth redirect rules while adding locale logic.
**Constraint**: MUST
**Verification**: Existing middleware tests still pass

#### Scenario: Protected route still redirects unauthenticated users

- **GIVEN** an unauthenticated request to `/dashboard`
- **WHEN** middleware runs
- **THEN** the response is a `302` redirect to `/login`
- **AND** no locale cookie/header is set because the redirect response short-circuits

#### Scenario: Auth page redirects authenticated users

- **GIVEN** an authenticated request to `/login`
- **WHEN** middleware runs
- **THEN** the response is a redirect to `/dashboard`
- **AND** locale headers are still applied if the redirect carries a response

---

### Requirement: Root layout sets html lang

The system SHALL render `RootLayout` with `<html lang={locale}>` based on the resolved request locale.
**Constraint**: MUST
**Verification**: Render test; HTML output inspection

#### Scenario: Vietnamese default

- **GIVEN** no cookie and `Accept-Language` resolves to `vi`
- **WHEN** the root layout renders
- **THEN** the HTML opening tag is `<html lang="vi">`

#### Scenario: English active

- **GIVEN** `x-app-locale: en` is read from the request
- **WHEN** the root layout renders
- **THEN** the HTML opening tag is `<html lang="en">`

#### Scenario: Japanese active

- **GIVEN** `x-app-locale: ja` is read from the request
- **WHEN** the root layout renders
- **THEN** the HTML opening tag is `<html lang="ja">`

---

### Requirement: generateMetadata reflects active locale

The system SHALL replace static `export const metadata` with `generateMetadata()` on pages where locale matters and produce localized title, description, and Open Graph locale.
**Constraint**: MUST
**Verification**: Unit tests per locale for key pages

#### Scenario: Home page metadata per locale

- **GIVEN** the active locale is `"en"`
- **WHEN** `generateMetadata()` runs for `/`
- **THEN** the title and description are in English
- **AND** `og:locale` is `"en_US"`

#### Scenario: Home page metadata in Japanese

- **GIVEN** the active locale is `"ja"`
- **WHEN** `generateMetadata()` runs for `/`
- **THEN** the title and description are in Japanese
- **AND** `og:locale` is `"ja_JP"`

#### Scenario: OG locale map used consistently

- **GIVEN** the locale is `"vi"`
- **WHEN** any page metadata is generated
- **THEN** `og:locale` is `"vi_VN"`
- **AND** the mapping is defined in `src/lib/i18n/constants.ts`

---

### Requirement: Server-only surfaces use request locale

The system SHALL localize server-rendered non-study copy from request-time catalogs.
**Constraint**: MUST
**Verification**: Route handler and server action tests

#### Scenario: API error message localized

- **GIVEN** a server route handler reads the active locale as `"ja"`
- **WHEN** it returns a user-facing validation error
- **THEN** the error message is loaded from `messages/ja/common.json`
- **AND** the message is in Japanese

#### Scenario: Auth email localized

- **GIVEN** a password-reset email is rendered for a user whose resolved locale is `"en"`
- **WHEN** the email template is generated
- **THEN** subject and body copy come from `messages/en/emails.json`

---

### Requirement: Study content is never translated

The system SHALL NOT pass flashcard, set, term, or definition text through `t()` or any translation pipeline.
**Constraint**: MUST
**Verification**: Static grep / contract test

#### Scenario: Flashcard viewer renders raw terms

- **GIVEN** a flashcard has `term="photosynthesis"` and `definition="quang hợp"`
- **WHEN** the card renders in any locale
- **THEN** the displayed text is exactly `"photosynthesis"` and `"quang hợp"`
- **AND** no catalog key or `t()` call is involved

#### Scenario: Set title raw on share page

- **GIVEN** a shared set title is `"Basic Accounting"`
- **WHEN** `/shared/{setId}` renders in Japanese
- **THEN** the page title uses the raw set title, not a translated key

---

## Out of Scope

- URL locale prefixes, alternate hreflang URLs, or per-locale canonical paths.
- Crawler-specific A/B locale delivery beyond `Accept-Language` fallback.
- Runtime locale switching inside `generateMetadata` (locale is already resolved by middleware before metadata runs).
