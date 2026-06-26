# dynamic-app-url Specification

## Purpose

TBD - created by archiving change google-auth-and-email. Update Purpose after archive.

## Requirements

### Requirement: Deterministic App URL Resolution

The system SHALL expose a single server-side base URL via `env.authUrl` in `src/config/env.ts`, resolved by `resolveAuthUrl()` in strict precedence order without reading env vars outside that module. `resolveAuthUrl` MAY be exported for unit tests.

**Precedence (first non-empty trimmed value wins):**

1. `AUTH_URL`
2. `NEXTAUTH_URL`
3. `NEXT_PUBLIC_APP_URL`
4. `VERCEL_URL` (prepend `https://` when no `http://` or `https://` prefix)
5. `http://localhost:3000` when `NODE_ENV !== 'production'` and steps 1–4 are unset
6. In `NODE_ENV === 'production'` with steps 1–4 unset, throw at module init (fail-fast)

**Constraint**: MUST  
**Verification**: Unit test `resolveAuthUrl()` branches in `src/config/env.test.ts` (or co-located test); manual forgot-password link on Vercel Preview

#### Scenario: Explicit AUTH_URL wins

- **GIVEN** `AUTH_URL=https://app.example.com/` and `NEXTAUTH_URL` is also set
- **WHEN** `env.authUrl` is read
- **THEN** value is `https://app.example.com` (trailing slash stripped)

#### Scenario: Vercel preview fallback

- **GIVEN** `AUTH_URL`, `NEXTAUTH_URL`, and `NEXT_PUBLIC_APP_URL` are unset
- **AND** `VERCEL_URL=my-app-git-feature-team.vercel.app`
- **WHEN** `env.authUrl` is read
- **THEN** value is `https://my-app-git-feature-team.vercel.app`

#### Scenario: Already-prefixed VERCEL_URL

- **GIVEN** only `VERCEL_URL=https://preview.example.com` is set
- **WHEN** `env.authUrl` is read
- **THEN** value is `https://preview.example.com` (no double `https://` prefix)

#### Scenario: NEXT_PUBLIC_APP_URL fallback

- **GIVEN** `AUTH_URL` and `NEXTAUTH_URL` are unset
- **AND** `NEXT_PUBLIC_APP_URL=https://preview.example.com`
- **WHEN** `env.authUrl` is read
- **THEN** value is `https://preview.example.com`

#### Scenario: Local development default

- **GIVEN** none of AUTH_URL, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, VERCEL_URL are set
- **AND** `NODE_ENV` is not `production`
- **WHEN** `env.authUrl` is read
- **THEN** value is `http://localhost:3000`

#### Scenario: Production fail-fast

- **GIVEN** none of AUTH_URL, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, VERCEL_URL are set (or all empty after trim)
- **AND** `NODE_ENV` is `production`
- **WHEN** `src/config/env.ts` module initializes
- **THEN** module init throws with a clear missing-URL configuration error

#### Scenario: Empty-string env treated as unset

- **GIVEN** `AUTH_URL=""` (empty) and `NEXTAUTH_URL=https://app.example.com`
- **WHEN** `env.authUrl` is read
- **THEN** value is `https://app.example.com`

#### Scenario: Trailing slash stripped before use

- **GIVEN** `AUTH_URL=https://app.example.com/`
- **WHEN** forgot-password builds `resetUrl`
- **THEN** URL is `https://app.example.com/reset-password?token=...` (no double slash)

### Requirement: Email Links Use Resolved Base URL

All server-side email link builders MUST compose URLs from `env.authUrl`, never hardcode `localhost:3000`.

**Constraint**: MUST  
**Verification**: Grep + unit test on `forgot-password/route.ts`

#### Scenario: Password reset email link

- **GIVEN** `env.authUrl` is `https://app.example.com`
- **WHEN** forgot-password creates a reset token for an existing user with `RESEND_API_KEY` set
- **THEN** `sendPasswordResetEmail` receives a URL starting with `https://app.example.com/reset-password?token=`
