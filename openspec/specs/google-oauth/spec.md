# google-oauth Specification

## Purpose

TBD - created by archiving change google-auth-and-email. Update Purpose after archive.

## Requirements

### Requirement: Google Provider Registration

The system SHALL register `GoogleProvider` in `src/server/auth.ts` when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are non-empty.

**Constraint**: MUST  
**Verification**: Inspect `src/server/auth.ts`; integration test with mocked OAuth when feasible

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

### Requirement: OAuth Account Not Linked Error UX

When NextAuth redirects to `/login?error=OAuthAccountNotLinked`, the login form SHALL display an inline error: "Email đã được đăng ký, vui lòng đăng nhập bằng mật khẩu."

**Constraint**: MUST  
**Verification**: Render `LoginForm` with `?error=OAuthAccountNotLinked` search param

#### Scenario: Duplicate email via Google

- **GIVEN** a user registered with email/password for `user@example.com`
- **AND** they attempt Google sign-in with the same email (unlinked)
- **WHEN** NextAuth redirects to `/login?error=OAuthAccountNotLinked`
- **THEN** `LoginForm` shows the Vietnamese error message above the form

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
