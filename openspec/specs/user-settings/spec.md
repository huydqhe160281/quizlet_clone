# Specification: user-settings

## Purpose

One signed-in place for personal preferences and account security, so the header stays
small as themes and languages grow. Lives at `/settings` (protected route).

## Requirements

### Requirement: Settings Page

The system SHALL provide a `/settings` page for signed-in users with Appearance, Language,
Account and Change password sections, reachable from the user menu (all widths) and the
desktop sidebar.

**Constraint**: MUST

#### Scenario: Signed-out visitor

- **GIVEN** a visitor without a session
- **WHEN** they open `/settings`
- **THEN** middleware redirects to `/login?callbackUrl=/settings`

#### Scenario: Header stays compact

- **GIVEN** a signed-in user on any width
- **WHEN** they open the avatar menu
- **THEN** it shows their name/email, a Settings link and Sign out — no inline theme grid or nested language menu

### Requirement: Appearance Section

The Appearance section SHALL list every entry of the theme registry
(`src/lib/theme/themes.ts`) plus System as a radio group of preview cards, each drawn with that
theme's own tokens. Adding a theme to the registry adds its card with no settings-page change.

**Constraint**: MUST

#### Scenario: Choose a theme

- **GIVEN** the settings page
- **WHEN** the user taps the "Paper & Ink" card
- **THEN** the theme applies immediately and the card is `aria-checked="true"`

### Requirement: Study Section

The Study section SHALL offer a device-local toggle (persisted in `localStorage`, default on) for the correct-answer chime used by every study mode and by "Know it" in Flashcard Mode.

**Constraint**: MUST

### Requirement: Language Section

The Language section SHALL list `SUPPORTED_LOCALES` by native name and switch locale through the
same flow as the guest switcher (cookie first, `PATCH /api/v1/user/preferences`, soft refresh).

**Constraint**: MUST

### Requirement: Change Password

`POST /api/v1/user/password` SHALL accept `{ currentPassword, newPassword }` (new: ≥ 8 chars,
different from current), verify the current password, store the new hash and bump
`sessionVersion` so every session — this one included — is revoked. Rate-limited per user with
the auth limiter; same-origin only.

**Constraint**: MUST

#### Scenario: Wrong current password

- **WHEN** the current password does not match
- **THEN** the API answers 400 `INVALID_PASSWORD` and nothing changes

#### Scenario: OAuth-only account

- **GIVEN** an account without a password hash (Google sign-in)
- **THEN** the page explains there is no password to change, and the API answers 400 `PASSWORD_NOT_SET`

#### Scenario: Successful change

- **WHEN** the change succeeds
- **THEN** the client shows a toast and signs out to `/login`
