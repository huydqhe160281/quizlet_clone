# Specification: Authentication

## Capability Summary
Người dùng có thể đăng ký, đăng nhập bằng Email/Password hoặc Google OAuth, và khôi phục mật khẩu — mọi session được bảo vệ bằng JWT httpOnly cookie.

## Layer Map

| Layer | Component | Symbol / Path |
|---|---|---|
| UI | Pages | `src/app/(auth)/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx` |
| UI | Components | `src/features/auth/components/` — LoginForm, RegisterForm, GoogleButton |
| API | Route Handlers | `src/app/api/auth/[...nextauth]/route.ts` (login, OAuth callbacks) |
| API | Custom endpoints | `src/app/api/v1/auth/register/route.ts`, `forgot-password/route.ts`, `reset-password/route.ts` |
| Service | Auth | `src/server/auth/auth.ts` — NextAuth config, providers |
| Service | Password | `hashPassword()`, `verifyPassword()` in `src/server/auth/auth.ts` |
| Middleware | Edge | `src/middleware.ts` — session guard, protected routes |
| DB | Schema | `prisma/schema.prisma` — User, Account, Session, VerificationToken |
| Validation | Schemas | `src/features/auth/schemas/auth.schema.ts` — loginSchema, registerSchema |

---

## ADDED Requirements

### Requirement: Email Login
The system SHALL allow registered users to sign in with their email and password.
**Constraint**: MUST
**Verification**: Integration test `test_login_valid_credentials()`, `test_login_invalid_password()`

#### Scenario: Successful Login
- **GIVEN** a registered user with correct password
- **WHEN** they submit the login form
- **THEN** a JWT session cookie is set (httpOnly, secure) and they are redirected to `/dashboard`

#### Scenario: Invalid Credentials
- **GIVEN** a registered user's email with an incorrect password
- **WHEN** they submit the login form
- **THEN** the API returns 401 with `{ error: "INVALID_CREDENTIALS" }` — no session cookie set; error does not distinguish between wrong email vs wrong password (enumeration-safe)

#### Scenario: Rate-Limited Login
- **GIVEN** a user who has submitted 5 failed login attempts within 60 seconds
- **WHEN** they submit a 6th attempt
- **THEN** the API returns 429 `{ error: "RATE_LIMITED" }` before any credential check

---

### Requirement: Email Registration
The system SHALL allow users to register with a unique email address and password (min 8 chars).
**Constraint**: MUST
**Verification**: Unit test `test_register_email_valid()`, integration test POST `/api/v1/auth/register`

#### Scenario: Successful Registration
- **GIVEN** a visitor with a valid email (not already registered) and password >= 8 chars
- **WHEN** they submit the registration form
- **THEN** a new User record is created with hashed password (bcrypt rounds=12), and they are redirected to `/dashboard`

#### Scenario: Duplicate Email
- **GIVEN** an email that already exists in the `users` table
- **WHEN** a new registration is submitted with the same email
- **THEN** the API returns 400 with `{ error: "EMAIL_ALREADY_EXISTS" }` and no User is created

#### Scenario: Weak Password
- **GIVEN** a registration form with password < 8 characters
- **WHEN** the form is submitted
- **THEN** Zod validation returns 400 with field-level error before any DB operation

---

### Requirement: Google OAuth Login
The system SHALL support Google OAuth sign-in via NextAuth.js Google Provider, creating a User + Account record on first login.
**Constraint**: MUST
**Verification**: E2E test `auth/google-oauth.spec.ts` (mocked)

#### Scenario: First-time Google Login
- **GIVEN** a user with a valid Google account who has never logged in before
- **WHEN** they click "Sign in with Google" and complete OAuth consent
- **THEN** a User + Account record is created, and they land on `/dashboard`

#### Scenario: Returning Google User
- **GIVEN** a user who has previously linked their Google account
- **WHEN** they sign in with Google again
- **THEN** they are logged in to the existing account (no duplicate User created)

---

### Requirement: Password Reset
The system SHALL allow registered users to reset their password via email token (expires 1 hour).
**Constraint**: MUST
**Verification**: Unit test `test_reset_token_expiry()`

#### Scenario: Valid Reset Flow
- **GIVEN** a registered user's email address
- **WHEN** they submit the forgot-password form, receive the email, and click the link within 1 hour
- **THEN** they can set a new password and the old VerificationToken is deleted

#### Scenario: Expired Token
- **GIVEN** a password reset token older than 1 hour
- **WHEN** the user submits the reset form with the expired token
- **THEN** the API returns 400 with `{ error: "TOKEN_EXPIRED" }` and no password is changed

---

### Requirement: Route Protection
The system SHALL redirect unauthenticated users to `/login` when accessing protected routes (`/dashboard`, `/sets`, `/study`).
**Constraint**: MUST
**Verification**: E2E test `auth/route-guard.spec.ts`

#### Scenario: Unauthenticated Access
- **GIVEN** a visitor without a valid session cookie
- **WHEN** they navigate to `/dashboard`
- **THEN** Edge Middleware redirects to `/login?callbackUrl=/dashboard`

#### Scenario: Authenticated Access
- **GIVEN** a user with a valid JWT session cookie
- **WHEN** they navigate to `/dashboard`
- **THEN** the page loads normally without redirect

---

### Requirement: Session Security
The system SHALL store JWT sessions in `httpOnly`, `secure`, `sameSite=lax` cookies to prevent XSS and CSRF.
**Constraint**: MUST
**Verification**: Security header audit in `tests/security/cookie.test.ts`

#### Scenario: Cookie Flags
- **GIVEN** a user who logs in successfully
- **WHEN** the session cookie is set
- **THEN** the cookie has `HttpOnly=true`, `Secure=true` (production), `SameSite=Lax`

---

## Out of Scope
- Social login providers other than Google (Facebook, GitHub, etc.)
- Two-factor authentication (2FA)
- LDAP / SSO enterprise authentication
- Account deletion / GDPR data export
