# Specification: preference-api

<!--
  Metadata: version 1.0, status: Draft
  Source: openspec/changes/i18n-multilingual-vi-en-ja/design-brief.md
-->

## Capability Summary

Session-scoped preference API lets authenticated users read and update their language choice, persisting it to `User.preferredLocale` and mirroring it in the `app-locale` cookie.

## Engine Layer Map

| Layer     | Crate               | Component/Symbol                                |
| --------- | ------------------- | ----------------------------------------------- |
| Core      | `src/lib/i18n`      | `Locale`, `isSupportedLocale()`, cookie helpers |
| Daemon    | `src/middleware.ts` | `x-app-locale` header injection                 |
| Interface | `mcp-backend`       | `GET/PATCH /api/user/preferences`               |

---

## ADDED Requirements

### Requirement: GET returns the authenticated user's saved locale

The system SHALL return the current user's `preferredLocale` via `GET /api/user/preferences`.
**Constraint**: MUST
**Verification**: Unit test `GET /api/user/preferences` with mocked session and database

#### Scenario: Authenticated user with saved preference

- **GIVEN** a logged-in user has `preferredLocale = "en"`
- **WHEN** `GET /api/user/preferences` is called
- **THEN** response status is `200`
- **AND** body is `{ "preferredLocale": "en" }`

#### Scenario: Authenticated user without saved preference

- **GIVEN** a logged-in user has `preferredLocale = null`
- **WHEN** `GET /api/user/preferences` is called
- **THEN** response status is `200`
- **AND** body is `{ "preferredLocale": null }`

#### Scenario: Unauthenticated request rejected

- **GIVEN** no valid session cookie is present
- **WHEN** `GET /api/user/preferences` is called
- **THEN** response status is `401`
- **AND** body contains a localized error message in the resolved locale

---

### Requirement: PATCH validates and persists locale choice

The system SHALL accept only supported locale values and persist them to the authenticated user's row while refreshing the `app-locale` cookie.
**Constraint**: MUST
**Verification**: Unit test `PATCH /api/user/preferences` success and error paths

#### Scenario: Valid locale update

- **GIVEN** an authenticated user with `preferredLocale = null`
- **WHEN** `PATCH /api/user/preferences` is called with body `{ "preferredLocale": "ja" }`
- **THEN** response status is `200`
- **AND** `User.preferredLocale` is updated to `"ja"`
- **AND** response `Set-Cookie` header refreshes `app-locale=ja` with correct attributes

#### Scenario: Invalid locale rejected

- **GIVEN** an authenticated user
- **WHEN** `PATCH /api/user/preferences` is called with body `{ "preferredLocale": "de" }`
- **THEN** response status is `400`
- **AND** `User.preferredLocale` remains unchanged

#### Scenario: Malformed body rejected

- **GIVEN** an authenticated user
- **WHEN** `PATCH /api/user/preferences` is called with body `{ "preferredLocale": 123 }`
- **THEN** response status is `400`
- **AND** no database write occurs

#### Scenario: Missing body rejected

- **GIVEN** an authenticated user
- **WHEN** `PATCH /api/user/preferences` is called with an empty body
- **THEN** response status is `400`
- **AND** no database write occurs

---

### Requirement: PATCH authorizes only the session user

The system SHALL derive the user identity from the session only and reject any attempt to target another user.
**Constraint**: MUST
**Verification**: Code review + unit test verifying session-scoped update

#### Scenario: Update own preference

- **GIVEN** a valid session for user `A`
- **WHEN** `PATCH /api/user/preferences` is called
- **THEN** only user `A`'s row is mutated
- **AND** no `userId` is read from the request body

#### Scenario: No session rejected

- **GIVEN** no valid session cookie
- **WHEN** `PATCH /api/user/preferences` is called with `{ "preferredLocale": "en" }`
- **THEN** response status is `401`
- **AND** no database write occurs

---

### Requirement: Cookie contract enforced on preference change

The system SHALL set the `app-locale` cookie using the agreed attributes whenever a preference is persisted.
**Constraint**: MUST
**Verification**: Integration test inspecting `Set-Cookie` header from `PATCH`

#### Scenario: Cookie attributes are correct

- **GIVEN** `PATCH /api/user/preferences` succeeds with locale `"en"`
- **WHEN** the response is inspected
- **THEN** `Set-Cookie` includes `app-locale=en`
- **AND** `Path=/`
- **AND** `SameSite=Lax`
- **AND** `Max-Age` equals approximately one year
- **AND** `HttpOnly` is absent

#### Scenario: Secure attribute in production

- **GIVEN** the request is served over HTTPS in production
- **WHEN** the cookie is set
- **THEN** `Secure` attribute is present

---

### Requirement: CSRF posture hardened with origin check

The system SHALL reject `PATCH` requests whose `Origin` header does not match the site URL when the header is present.
**Constraint**: MUST
**Verification**: Unit test with mismatched origin header

#### Scenario: Mismatched origin rejected

- **GIVEN** `Origin: https://evil.example`
- **WHEN** `PATCH /api/user/preferences` is called
- **THEN** response status is `403`
- **AND** `User.preferredLocale` remains unchanged

#### Scenario: Same origin allowed

- **GIVEN** `Origin` matches the deployment URL
- **WHEN** `PATCH /api/user/preferences` is called
- **THEN** response status is `200`

#### Scenario: No origin header allowed

- **GIVEN** the request omits an `Origin` header
- **WHEN** `PATCH /api/user/preferences` is called
- **THEN** response status is `200`
- **AND** the request is still protected by `SameSite=Lax` session cookie semantics

---

## Out of Scope

- Guest locale persistence (guests use the `app-locale` cookie directly; no `/api/user/preferences` access).
- Bulk updates or non-locale preference fields.
- Rate limiting beyond existing session cookie protection.
