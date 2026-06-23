---
name: auth-entry-redirect
description: Redirect authenticated users from public entry routes to dashboard.
version: 1.0.0
---

# Auth Entry Redirect Specifications

## ADDED Requirements

### Requirement: Middleware Matcher Includes Auth Entry Routes

The middleware `config.matcher` SHALL include `/`, `/login`, and `/register` so the auth callback executes for routes subject to authenticated-user redirect.

**Constraint**: MUST

#### Scenario: Middleware runs on landing page

- **GIVEN** middleware is configured
- **WHEN** a request targets `/`
- **THEN** the middleware auth callback executes (matcher is not excluded for `/`)

#### Scenario: Middleware runs on login page

- **GIVEN** middleware is configured
- **WHEN** a request targets `/login`
- **THEN** the middleware auth callback executes

---

### Requirement: Authenticated User Entry Redirect

The system SHALL redirect authenticated users away from public entry routes to `/dashboard`.

**Constraint**: MUST

**Auth-entry routes (positive allowlist)**: `/`, `/login`, `/register`

#### Scenario: Landing page redirect

- **GIVEN** user has a valid session
- **WHEN** user navigates to `/`
- **THEN** middleware responds with redirect to `/dashboard`

#### Scenario: Login page redirect

- **GIVEN** user has a valid session
- **WHEN** user navigates to `/login`
- **THEN** middleware responds with redirect to `/dashboard`

#### Scenario: Register page redirect

- **GIVEN** user has a valid session
- **WHEN** user navigates to `/register`
- **THEN** middleware responds with redirect to `/dashboard`

#### Scenario: CallbackUrl preserved for unauthenticated flow

- **GIVEN** user has no session
- **WHEN** user is redirected to `/login?callbackUrl=/sets/abc`
- **THEN** after successful login, NextAuth navigates to the callback URL (existing behavior unchanged)

---

### Requirement: Public Routes Remain Accessible

The system SHALL NOT redirect authenticated users away from public content routes outside the auth-entry allowlist.

**Constraint**: MUST

#### Scenario: Library while logged in

- **GIVEN** user has a valid session
- **WHEN** user navigates to `/library`
- **THEN** the page loads normally without redirect to `/dashboard`

#### Scenario: Shared set preview while logged in

- **GIVEN** user has a valid session
- **WHEN** user navigates to `/shared/[setId]`
- **THEN** the shared set preview loads normally

---

### Requirement: Unauthenticated Access Unchanged

The system SHALL preserve existing behavior protecting authenticated routes for unauthenticated users.

**Constraint**: MUST

#### Scenario: Protected route without session

- **GIVEN** user has no session
- **WHEN** user navigates to `/dashboard`
- **THEN** user is redirected to `/login` with `callbackUrl` preserved

#### Scenario: Protected prefixes enumerated

- **GIVEN** user has no session
- **WHEN** user navigates to any path under `/sets`, `/study`, or `/search`
- **THEN** user is redirected to `/login` with `callbackUrl` set to the requested path

---

### Requirement: Sign Out Lands on Landing

After sign out, an unauthenticated user SHALL reach the landing page at `/` without being redirected back to `/dashboard`.

**Constraint**: MUST

#### Scenario: Post sign-out landing

- **GIVEN** user clicks Sign out in Navbar (`signOut({ callbackUrl: '/' })`)
- **WHEN** session is cleared and redirect completes
- **THEN** user views the landing page at `/` as an unauthenticated visitor
