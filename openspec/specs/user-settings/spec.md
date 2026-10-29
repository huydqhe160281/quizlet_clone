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

### Requirement: Email Verification Status

The Account section SHALL show whether the email is verified. OAuth-only accounts (no
password) SHALL count as verified (`isEmailConsideredVerified` in
`src/server/auth/email-verified.ts`, shared with `/api/v1/auth/me`). While a password account
is unverified, the section SHALL explain the limits below and offer a resend button that calls
`POST /api/v1/auth/verify-email/resend` (rate limited per user), so the user can still resend
after dismissing the app-wide banner.

#### Scenario: Resend from settings

- **WHEN** an unverified password user taps resend
- **THEN** a new link is emailed, older links stop working, and the page says where it was sent

#### Scenario: Google account

- **WHEN** a Google-only user opens the settings page
- **THEN** the email shows as verified and no resend button appears

### Requirement: Limits for Unverified Accounts

Unverified accounts SHALL be able to sign in and study, with three limits enforced on the server:

- Publishing: creating, importing or switching a set to `PUBLIC` SHALL fail with `403 EMAIL_NOT_VERIFIED` (`assertCanPublish`). Sets that are already public may stay public and be edited. The create/edit and import forms disable the Public option and link to Settings.
- AI set generation: at most `AI_GENERATE_UNVERIFIED_DAILY_LIMIT` (3) generations per 24 hours, on top of the hourly limit; the next request fails with `429 AI_QUOTA_UNVERIFIED` and the modal asks the user to verify. A generation that fails (or is refused) gives its slot back, so the allowance counts sets actually created. The assistant chat is not affected.
- Study: once the account's lifetime reviews (the activity heatmap count: `ReviewHistory` rows plus answered `SessionCard` rows, old and new cards alike) reach `UNVERIFIED_STUDY_LIMIT` (200), starting a new study session (`POST /api/v1/study/sessions`) or opening the spaced-review queue (`GET /api/v1/study/due-cards`) SHALL fail with `403 STUDY_LIMIT_REACHED` (`assertCanStartStudy`). Only starting is gated: resuming an incomplete session, answers inside a session or review already started, and offline replays SHALL still be accepted, so a session that crosses the limit is finished. The completion screen, the start forms and `/today` then show a notice with a resend button; `/api/v1/auth/me` returns `studyLimit: { used, limit, reached }` and the app banner shows the reviews left. Deleting a set removes its reviews and so lowers the count.

#### Scenario: Unverified user tries to publish

- **GIVEN** an unverified password account
- **WHEN** it creates a set with visibility `PUBLIC`
- **THEN** the API returns 403 `EMAIL_NOT_VERIFIED` and no set is created

#### Scenario: Unverified user exceeds the AI allowance

- **GIVEN** an unverified account that generated 3 sets with AI in the last 24 hours
- **WHEN** it requests another generation
- **THEN** the API returns 429 `AI_QUOTA_UNVERIFIED`

#### Scenario: Unverified user reaches the study limit mid-session

- **GIVEN** an unverified password account with 190 reviews that starts a 50-card session
- **WHEN** its 10th answer brings the count to 200
- **THEN** it can answer the remaining cards, the completion screen asks it to verify the email, and its next attempt to start a session or the spaced-review queue returns 403 `STUDY_LIMIT_REACHED`

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
- **THEN** the page explains there is no password yet and links to `/forgot-password` to set one, and the API answers 400 `PASSWORD_NOT_SET`

#### Scenario: Successful change

- **WHEN** the change succeeds
- **THEN** the client shows a toast and signs out to `/login`
