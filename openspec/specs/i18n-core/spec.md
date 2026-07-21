# Specification: i18n-core

<!--
  Metadata: version 1.0, status: Draft
  Source: i18n-multilingual-vi-en-ja design-brief.md + decomposition.md
-->

## Capability Summary

Provide a thin, framework-light i18n foundation that supports Vietnamese, English, and Japanese UI/system copy with deterministic locale resolution, on-demand catalog loading, server-safe translation, and a client-side context/hook.

## Engine Layer Map

| Layer     | Crate         | Component/Symbol                                            |
| --------- | ------------- | ----------------------------------------------------------- |
| Core      | `core`        | `Locale` type, `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `t()` |
| Core      | `core`        | `resolveLocale()`, `loadCatalog()`, `getRequestLocale()`    |
| Interface | `mcp-backend` | `LocaleProvider.tsx`, `useTranslations()`                   |

_(Mapped to Next.js layers: `src/lib/i18n/_`as core,`src/lib/i18n/LocaleProvider.tsx` as interface.)\*

## ADDED Requirements

### Requirement: Locale constants and supported set

The system SHALL define a `Locale` union of exactly `vi`, `en`, `ja`; `DEFAULT_LOCALE = 'vi'`; `SUPPORTED_LOCALES = ['vi','en','ja']`; `APP_LOCALE_COOKIE = 'app-locale'`; and an `ACCEPT_LANGUAGE_MAP` for q-value parsing.
**Constraint**: MUST
**Verification**: unit test `constants.test()`

#### Scenario: Valid constants

- **GIVEN** the i18n core module is imported
- **WHEN** code reads `SUPPORTED_LOCALES` or `DEFAULT_LOCALE`
- **THEN** it returns exactly the locked Vietnamese-default set

#### Scenario: Reject unsupported locale values

- **GIVEN** a runtime value such as `'fr'`
- **WHEN** it is passed through the `isLocale()` guard
- **THEN** it returns `false` and falls back to `DEFAULT_LOCALE`

---

### Requirement: Deterministic locale resolution

The system SHALL resolve the active locale with precedence: non-null `User.preferredLocale` → valid `app-locale` cookie → `Accept-Language` supported tag → `vi`.
**Constraint**: MUST
**Verification**: unit test `resolveLocale.test()`

#### Scenario: DB preference wins over cookie

- **GIVEN** `dbLocale = 'ja'`, `cookieLocale = 'en'`, `acceptLanguage = 'en-US,en;q=0.9'`
- **WHEN** `resolveLocale()` is invoked
- **THEN** it returns `'ja'`

#### Scenario: Valid cookie used when DB is null

- **GIVEN** `dbLocale = null`, `cookieLocale = 'en'`, `acceptLanguage = 'vi'`
- **WHEN** `resolveLocale()` is invoked
- **THEN** it returns `'en'`

#### Scenario: Accept-Language fallback to Vietnamese

- **GIVEN** `dbLocale = null`, `cookieLocale = undefined`, `acceptLanguage = 'es-ES,es;q=0.9'`
- **WHEN** `resolveLocale()` is invoked
- **THEN** it returns `'vi'`

#### Scenario: Invalid cookie ignored

- **GIVEN** `cookieLocale = 'fr'`
- **WHEN** `resolveLocale()` is invoked
- **THEN** it ignores the cookie and proceeds to `Accept-Language` or default

---

### Requirement: On-demand catalog loading

The system SHALL load only the active locale files from `messages/{locale}/**/*.json` and merge them into a single catalog object per request.
**Constraint**: MUST
**Verification**: unit test `loadCatalog.test()`

#### Scenario: Load active locale only

- **GIVEN** `locale = 'en'`
- **WHEN** `loadCatalog('en')` runs
- **THEN** it returns merged English catalogs and does not read `messages/vi/*` or `messages/ja/*`

#### Scenario: Missing locale falls back to Vietnamese

- **GIVEN** a request for an unsupported or missing locale file
- **WHEN** `loadCatalog()` fails for the requested locale
- **THEN** it returns the Vietnamese catalog set as the final fallback

---

### Requirement: Server-safe translation helper

The system SHALL provide `t(catalog, key, interpolations?)` that supports dotted keys and simple `{placeholder}` interpolation, with no ICU plural engine in v1.
**Constraint**: MUST
**Verification**: unit test `t.test()`

#### Scenario: Translate nested key

- **GIVEN** a catalog containing `{ "auth": { "login": "Log in" } }` and key `"auth.login"`
- **WHEN** `t()` is called
- **THEN** it returns `"Log in"`

#### Scenario: Interpolate values

- **GIVEN** a catalog entry `"Welcome, {name}"`
- **WHEN** `t(catalog, 'welcome', { name: 'An' })` is called
- **THEN** it returns `"Welcome, An"`

#### Scenario: Missing key returns the key

- **GIVEN** a catalog that does not contain `"unknown.key"`
- **WHEN** `t()` is called
- **THEN** it returns `"unknown.key"` to aid debugging

---

### Requirement: Request locale accessor

The system SHALL expose `getRequestLocale()` that reads the `x-app-locale` header first, then falls back to the `app-locale` cookie, for use in React Server Components and Route Handlers.
**Constraint**: MUST
**Verification**: unit test `getRequestLocale.test()`

#### Scenario: Header takes precedence

- **GIVEN** headers `{ 'x-app-locale': 'ja' }` and cookies `{ 'app-locale': 'en' }`
- **WHEN** `getRequestLocale()` reads the request
- **THEN** it returns `'ja'`

#### Scenario: Cookie fallback

- **GIVEN** no `x-app-locale` header and cookies `{ 'app-locale': 'en' }`
- **WHEN** `getRequestLocale()` reads the request
- **THEN** it returns `'en'`

#### Scenario: Invalid values fall back to default

- **GIVEN** header or cookie value `'fr'`
- **WHEN** `getRequestLocale()` reads the request
- **THEN** it returns `'vi'`

---

### Requirement: Client translation context

The system SHALL provide a `LocaleProvider` that supplies the active locale and catalog to client components, plus `useTranslations()` returning a bound `t` function.
**Constraint**: MUST
**Verification**: component test `LocaleProvider.test.tsx`

#### Scenario: Nested components use active locale

- **GIVEN** `LocaleProvider` is rendered in `RootLayout` with `locale='en'` and the English catalog
- **WHEN** a nested component calls `useTranslations()`
- **THEN** it receives English strings and can switch locale via the provided setter

#### Scenario: Missing provider fails safely

- **GIVEN** `useTranslations()` is called outside `LocaleProvider`
- **WHEN** the hook executes
- **THEN** it throws or returns a clear error to enforce correct placement

---

### Requirement: Study content never translated

The system SHALL NOT pass flashcard, set, term, definition, title, or AI-generated explanation strings through `t()` or any catalog translation pipeline.
**Constraint**: MUST
**Verification**: contract test `src/lib/i18n/__tests__/contracts.test.ts`

#### Scenario: Study strings rendered raw

- **GIVEN** a flashcard term `"Hola"` or set title `"Spanish 101"`
- **WHEN** the UI renders the content
- **THEN** it appears exactly as stored, regardless of active locale

#### Scenario: Static analysis rejects t() on study paths

- **GIVEN** a grep of `src/lib/flashcards`, `src/lib/sets`, or similar data paths
- **WHEN** the contract test runs
- **THEN** no calls to `t(` are found in those paths

---

## Out of Scope

- ICU plurals, gendered messages, or RTL layout.
- URL locale prefixes (`/[locale]` routes) or multi-URL hreflang.
- Translating user-generated study content.
- Runtime language detection beyond `Accept-Language`.
- Any locale beyond `vi`, `en`, `ja`.
