# auth-hardening Specification

## Purpose
Forgot-password flow for dev (visible reset URL) and production (Resend email); session persistence via Remember me and explicit cookie maxAge.

## Requirements

### Requirement: Forgot Password Email Delivery
The system SHALL send a password reset email when `RESEND_API_KEY` is configured; in non-production without key, return a dev-only reset URL in the API response.
**Constraint**: MUST
**Verification**: Unit test `test_forgot_password_dev_reset_url()`, integration test with mocked Resend

#### Scenario: Production Email Sent
- **GIVEN** `RESEND_API_KEY` is set and user exists
- **WHEN** POST `/api/v1/auth/forgot-password` with valid email
- **THEN** Resend `emails.send` is called and response is 200 without `devResetUrl`

#### Scenario: Dev Reset URL Shown
- **GIVEN** `NODE_ENV=development` and `RESEND_API_KEY` empty
- **WHEN** forgot-password succeeds for existing user
- **THEN** response includes `data.devResetUrl` and UI displays copyable link

#### Scenario: Enumeration Safe Response
- **GIVEN** email not registered (no matching user in DB)
- **WHEN** forgot-password is submitted (any environment, any `RESEND_API_KEY` state)
- **THEN** response 200 with the same generic success message AND `devResetUrl` MUST be absent (even in `NODE_ENV=development`)
- **Note**: The service MUST NOT branch on whether the user exists when composing the response body — only after confirming the user exists should `devResetUrl` be conditionally included.

---

### Requirement: Remember Me Session
The system SHALL support optional "Remember me" on login: 30-day session when checked, 24-hour session when unchecked.
**Constraint**: MUST
**Verification**: Unit test `test_remember_me_extends_max_age()`, E2E `tests/e2e/auth/session-persist.spec.ts`

#### Scenario: Remember Me Checked
- **GIVEN** user logs in with Remember me checked
- **WHEN** session cookie is set
- **THEN** cookie `maxAge` ≈ 30 days

#### Scenario: Remember Me Unchecked
- **GIVEN** user logs in without Remember me
- **WHEN** session cookie is set
- **THEN** cookie `maxAge` ≈ 24 hours

#### Scenario: Session Persists After Browser Restart
- **GIVEN** user logged in with Remember me on same origin
- **WHEN** browser context is closed and reopened (E2E storageState)
- **THEN** `/dashboard` loads without redirect to `/login`

---

### Requirement: Session Cookie Configuration
The system SHALL set httpOnly, SameSite=Lax, and **explicit maxAge** on the session token cookie, matching the JWT session `maxAge` value. NOTE: The current V1 `auth.config.ts` (`src/server/auth.config.ts`) is missing `maxAge` in `cookies.sessionToken.options` — this MUST be added as part of V2.
**Constraint**: MUST
**Verification**: Existing `tests/security/cookie.test.ts` updated for maxAge; manual inspection of `auth.config.ts` cookie options

#### Scenario: Cookie Security Flags
- **GIVEN** any authenticated session
- **WHEN** Set-Cookie header is inspected
- **THEN** httpOnly=true, sameSite=lax, secure=true in production, **and `maxAge` matches the JWT `session.maxAge`** (default 24h when Remember me unchecked, 30 days when checked)

#### Scenario: Typed Env Guard for NODE_ENV
- **GIVEN** `auth.config.ts` and `forgot-password/route.ts` need to check production status
- **WHEN** any production guard is implemented
- **THEN** MUST use `env.nodeEnv` (typed env accessor from `@/lib/env`) instead of raw `process.env.NODE_ENV` — the existing V1 usage of raw `process.env.NODE_ENV` at line 20 of `auth.config.ts` MUST be migrated in the same PR
