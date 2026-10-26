# google-oauth Specification

## Purpose

TBD - created by archiving change google-auth-and-email. Update Purpose after archive.

## Requirements

### Requirement: Google Provider Registration

The system SHALL register `GoogleProvider` in `src/server/auth/auth.ts` when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are non-empty.

**Constraint**: MUST  
**Verification**: Inspect `src/server/auth/auth.ts`; integration test with mocked OAuth when feasible

#### Scenario: Provider active with credentials

- **GIVEN** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- **WHEN** NextAuth initializes
- **THEN** Google provider is included in the `providers` array

#### Scenario: Provider omitted without secrets

- **GIVEN** either Google env var is empty
- **WHEN** NextAuth initializes
- **THEN** Google provider is not registered and Credentials auth remains available

### Requirement: Google Sign-In UI

Login and register pages SHALL render a "Continue with Google" button that calls `signIn('google', { callbackUrl: '/dashboard' })`.

**Constraint**: MUST  
**Verification**: Component test or E2E on `/login` and `/register`

#### Scenario: Login page Google button

- **GIVEN** user visits `/login`
- **WHEN** they click "Continue with Google"
- **THEN** NextAuth Google OAuth flow starts with post-auth redirect to `/dashboard`

#### Scenario: Register page Google button

- **GIVEN** user visits `/register`
- **WHEN** they click "Continue with Google"
- **THEN** NextAuth Google OAuth flow starts with post-auth redirect to `/dashboard`

### Requirement: Linking Google to an Existing Email

Google sign-in SHALL link to an existing user with the same email (`allowDangerousEmailAccountLinking`), guarded by `prepareGoogleSignIn` in the `signIn` callback (`src/server/auth/google-account-claim.ts`):

- Google MUST report `email_verified: true`; otherwise the callback returns the redirect `/login?error=GoogleEmailUnverified` and the login form shows `auth.googleEmailUnverified` (returning `false` would land on Auth.js's own error page, since `pages.error` is unset).
- The Google profile email is lowercased (provider `profile()`), matching credentials sign-ups, so the claim and the adapter's lookup by email see the same row.
- An existing password account that never verified its email is taken over by the Google user: its password hash and pending reset/verification tokens are removed, `emailVerified` is set, and `sessionVersion` is bumped so every earlier session ends. The address then receives an `emails.accountClaimed` notice with a link to `/forgot-password` to set a password again (a failed send is logged and does not block sign-in). The takeover runs before linking on purpose: if linking then fails, signing in with Google again completes it.
- A verified password account keeps its password and gains Google as a second sign-in method.
- Users created or linked through Google get `emailVerified` set (`events.linkAccount`).

**Constraint**: MUST
**Verification**: `src/server/auth/google-account-claim.test.ts`

#### Scenario: Someone registered with my email but never verified it

- **GIVEN** a password account for `user@example.com` with `emailVerified = null`
- **WHEN** the real owner signs in with Google using `user@example.com`
- **THEN** they are signed in to that account, the old password no longer works and the other sessions are signed out

#### Scenario: Verified password account

- **GIVEN** a verified password account for `user@example.com`
- **WHEN** its owner signs in with Google
- **THEN** Google is linked and both the password and Google keep working

#### Scenario: Unverified Google address

- **WHEN** Google returns `email_verified: false`
- **THEN** the user returns to `/login` with the `GoogleEmailUnverified` message

### Requirement: Prisma Adapter Compatibility

Google OAuth MUST persist linked accounts via the existing `Account` and `User` Prisma models with `@auth/prisma-adapter`. No schema migration required.

**Constraint**: MUST  
**Verification**: Schema inspection of `Account.provider`, `Account.providerAccountId`, `User.email`

#### Scenario: New Google user persisted

- **GIVEN** first-time Google sign-in for a new email
- **WHEN** OAuth callback succeeds
- **THEN** `User` and `Account` rows are created

#### Scenario: JWT session issued after Google sign-in

- **GIVEN** OAuth callback succeeds for a valid Google account
- **WHEN** NextAuth completes the sign-in flow
- **THEN** an authenticated JWT session is available to the client
