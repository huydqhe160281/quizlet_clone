# Specification: language-switcher

<!--
  Metadata: version 1.0, status: Draft
  Source: openspec/changes/i18n-multilingual-vi-en-ja/design-brief.md
-->

## Capability Summary

Keyboard-accessible language switcher lets users toggle the UI between Vietnamese, English, and Japanese; it updates the `app-locale` cookie, persists the choice for logged-in users, and refreshes the page via Next.js soft refresh.

## Engine Layer Map

| Layer     | Crate          | Component/Symbol                              |
| --------- | -------------- | --------------------------------------------- |
| Core      | `src/lib/i18n` | `SUPPORTED_LOCALES`, `Locale`, cookie helpers |
| Agent     | `sub-agent`    | `LanguageSwitcher` React component            |
| Interface | `mcp-backend`  | `PATCH /api/user/preferences` integration     |

---

## ADDED Requirements

### Requirement: Switcher renders supported locales

The system SHALL provide a language switcher that lists exactly the supported locales: Vietnamese, English, and Japanese.
**Constraint**: MUST
**Verification**: Component unit test or Storybook render test

#### Scenario: Switcher is visible

- **GIVEN** the header or settings page renders
- **WHEN** `LanguageSwitcher` is mounted
- **THEN** it displays options for `vi`, `en`, and `ja`
- **AND** it uses human-readable native labels (`Tiếng Việt`, `English`, `日本語`)

#### Scenario: Current locale highlighted

- **GIVEN** the active locale is `"ja"`
- **WHEN** the switcher renders
- **THEN** the `ja` option is visibly marked as active (`aria-pressed="true"` or equivalent)
- **AND** `vi` and `en` are marked inactive

---

### Requirement: Switcher is keyboard accessible

The system SHALL make the language switcher operable by keyboard and screen readers.
**Constraint**: MUST
**Verification**: Axe or manual keyboard navigation test

#### Scenario: Keyboard focus and selection

- **GIVEN** the switcher is rendered as a dropdown or button group
- **WHEN** the user tabs into the control and presses Enter/Space on an inactive locale
- **THEN** the active locale changes
- **AND** focus remains inside the control until the user dismisses it

#### Scenario: Screen reader announces language

- **GIVEN** a screen reader is active
- **WHEN** the switcher receives focus
- **THEN** the control announces "Change language" or equivalent localized label
- **AND** each option announces its native name and current state

---

### Requirement: Selecting a locale updates the cookie immediately

The system SHALL write the chosen locale to the `app-locale` cookie without waiting for a server round-trip.
**Constraint**: MUST
**Verification**: Component test or Playwright click test

#### Scenario: Guest selects English

- **GIVEN** a guest user with `app-locale=vi`
- **WHEN** they select `en` from the switcher
- **THEN** the browser cookie `app-locale` is updated to `en`
- **AND** a soft refresh is triggered via `router.refresh()`

#### Scenario: Guest selects Japanese

- **GIVEN** a guest user with `app-locale=en`
- **WHEN** they select `ja` from the switcher
- **THEN** the browser cookie `app-locale` is updated to `ja`
- **AND** a soft refresh is triggered

---

### Requirement: Logged-in user persists choice via PATCH

The system SHALL call `PATCH /api/user/preferences` for authenticated users so the choice survives cross-device sessions.
**Constraint**: MUST
**Verification**: Mocked fetch unit test; E2E test across login

#### Scenario: Authenticated user switches locale

- **GIVEN** a logged-in user with `preferredLocale=null`
- **WHEN** they select `en` from the switcher
- **THEN** `PATCH /api/user/preferences` is called with `{ "preferredLocale": "en" }`
- **AND** on success the `app-locale` cookie is refreshed by the response
- **AND** a soft refresh is triggered

#### Scenario: PATCH fails gracefully

- **GIVEN** a logged-in user selects `ja`
- **WHEN** the network request fails with status `500`
- **THEN** the UI still keeps the cookie-based `ja` value
- **AND** a non-blocking toast or inline error informs the user that the server save failed
- **AND** the user can retry on next interaction

---

### Requirement: Soft refresh preserves UI state where safe

The system SHALL prefer `router.refresh()` over a hard reload. Soft refresh MAY run during an active study session. A hard reload MUST NOT interrupt an active study session without user confirmation.
**Constraint**: MUST (hard-reload guard); SHOULD (prefer soft refresh)
**Verification**: Playwright interaction test

#### Scenario: Non-study page refresh

- **GIVEN** the user is on `/dashboard`
- **WHEN** they switch language to `en`
- **THEN** `router.refresh()` is called
- **AND** the page re-renders in English without a full document reload

#### Scenario: Study session soft refresh allowed

- **GIVEN** the user is inside an active study session
- **WHEN** they switch language and soft refresh is available
- **THEN** `router.refresh()` applies the new catalog without a hard reload and without a confirmation dialog
- **AND** in-progress card progress is not discarded by a full document reload

#### Scenario: Study session hard-reload guard

- **GIVEN** the user is inside an active study session and soft refresh cannot apply the locale
- **WHEN** a hard reload would be required
- **THEN** the system warns the user and requires confirmation before reloading

---

### Requirement: Switcher uses locale from context

The system SHALL read the active locale from `LocaleProvider` and not duplicate resolution logic.
**Constraint**: MUST
**Verification**: Render test with mocked `LocaleProvider`

#### Scenario: Provider supplies active locale

- **GIVEN** `LocaleProvider` exposes `locale="en"`
- **WHEN** `LanguageSwitcher` renders
- **THEN** it preselects `en` without reading the cookie directly

#### Scenario: Provider supplies catalog labels

- **GIVEN** the active catalog contains `common.language.vi`, `common.language.en`, `common.language.ja`
- **WHEN** `LanguageSwitcher` renders
- **THEN** labels are sourced from the catalog
- **AND** no hardcoded UI copy remains in the component

---

## Out of Scope

- Auto-translation of study content (cards, sets, definitions remain in the author's language).
- URL locale prefixes or per-locale routes.
- Language detection from browser settings (handled by middleware; switcher reflects the resolved value).
