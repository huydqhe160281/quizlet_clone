# Specification: server-localized-copy

<!--
  Metadata: version 1.0, status: Draft
  Scope: server-only surfaces that must return copy in the active request locale.
-->

## Capability Summary

Return localized system copy for API errors, auth emails, and guide/assistant prompts from runtime catalogs, while keeping study content raw and never translated.

## Engine Layer Map

| Layer     | Crate         | Component/Symbol                            |
| --------- | ------------- | ------------------------------------------- |
| Core      | `core`        | `resolveLocale`, `loadCatalog`, `t`         |
| Daemon    | `daemon`      | `getRequestLocale`, `src/lib/guide/prompts` |
| Agent     | `sub-agent`   | email renderer, API error formatter         |
| Interface | `mcp-backend` | Route Handler error responses, middleware   |

---

## ADDED Requirements

### Requirement: Localized API Error Messages

The system SHALL return user-facing API error strings from `messages/{locale}/common.json` resolved for the active request locale.
**Constraint**: MUST
**Verification**: unit tests in `src/lib/i18n/__tests__/t.test.ts`, route handler tests for `/api/**`

#### Scenario: Validation error in resolved locale

- **GIVEN** a request with `x-app-locale: ja`
- **WHEN** an API route returns a validation error using the shared error helper
- **THEN** the response body contains the Japanese text for that error key

#### Scenario: Unsupported locale falls back to Vietnamese

- **GIVEN** a request with no valid locale cookie or header and `Accept-Language: fr`
- **WHEN** an API route returns a generic error
- **THEN** the response body contains the Vietnamese error string

### Requirement: Localized Auth Emails

The system SHALL render authentication email subjects and bodies from `messages/{locale}/emails.json` for the recipient's active locale.
**Constraint**: MUST
**Verification**: unit test `renderAuthEmailUsesActiveLocale()`, integration test for sign-up flow

#### Scenario: Password-reset email in English

- **GIVEN** a user whose `preferredLocale` is `en`
- **WHEN** a password-reset email is composed
- **THEN** the subject and body use the English catalog strings

#### Scenario: Fallback email locale for null preference

- **GIVEN** a user with `preferredLocale: null` and an `app-locale: ja` cookie
- **WHEN** an auth email is composed
- **THEN** the email uses Japanese strings

### Requirement: Guide Runtime Prompts

The system SHALL read guide/assistant prompt text from `messages/{locale}/guide.json` at request time.
**Constraint**: MUST
**Verification**: unit tests in `src/lib/guide/__tests__/prompts.test.ts`

#### Scenario: Guide prompt follows active locale

- **GIVEN** a request with `x-app-locale: en`
- **WHEN** the guide prompt builder assembles the system prompt
- **THEN** it interpolates copy from `messages/en/guide.json`

#### Scenario: Build script no longer freezes guide copy to Vietnamese

- **GIVEN** `scripts/generate-guide-config.mjs` runs at build time
- **WHEN** it emits the guide configuration artifact
- **THEN** the artifact omits hardcoded `locale: 'vi'` user-facing strings and references `guide.json` keys instead

### Requirement: Study Content Stays Raw

The system SHALL NOT pass flashcard titles, terms, definitions, set names, explanations, or any user-generated study content through `t()` or any translation pipeline.
**Constraint**: MUST
**Verification**: contract test `studyContentNeverTranslated()`

#### Scenario: Flashcard term rendered verbatim

- **GIVEN** a flashcard with term `"cell membrane"` stored in the database
- **WHEN** the study endpoint returns the flashcard
- **THEN** the response contains `"cell membrane"` unchanged regardless of active locale

#### Scenario: Study endpoint locale invariance

- **GIVEN** the same set requested with `x-app-locale: vi`, then `en`, then `ja`
- **WHEN** comparing the three responses
- **THEN** all study fields are byte-for-byte identical across locales

---

## Out of Scope

- URL locale prefixes or hreflang alternates.
- Translation of user-generated study content.
- Client-side UI chrome (covered by component specs).
- Adding locales beyond `vi`, `en`, `ja`.
