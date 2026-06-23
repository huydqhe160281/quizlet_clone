---
name: ui-pages
description: Page-level glass-modern styling for landing, auth, public, and loading states.
version: 1.0.0
---

# UI Pages Specifications

## ADDED Requirements

### Requirement: Landing Page Visual Refresh

The landing page at `/` SHALL use glass-modern styling (hero, feature cards, header CTAs) while preserving existing links and routes.

**Constraint**: MUST

#### Scenario: Landing page links unchanged

- **GIVEN** an unauthenticated visitor on `/`
- **WHEN** the landing page renders
- **THEN** "Sign in", "Get started", and "Browse public library" links navigate to `/login`, `/register`, and `/library` respectively

---

### Requirement: Auth Pages Visual Refresh

Auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`) SHALL use glass-modern form styling and ambient background consistent with the design system.

**Constraint**: MUST

#### Scenario: Auth form submission unchanged

- **GIVEN** a user on `/login`
- **WHEN** the user submits valid credentials
- **THEN** existing NextAuth login flow executes without modification to validation or API calls

---

### Requirement: Theme Toggle on Public Entry Surfaces

Theme toggle SHALL be reachable on landing and auth layouts (not only app Navbar), since authenticated users are redirected away from those routes.

**Constraint**: MUST

#### Scenario: Theme toggle on auth layout

- **GIVEN** an unauthenticated user on `/login`
- **WHEN** the auth layout renders
- **THEN** a theme toggle control is visible and functional

#### Scenario: Theme toggle on landing page

- **GIVEN** an unauthenticated visitor on `/`
- **WHEN** the landing page renders
- **THEN** a theme toggle control is visible in the header area

---

### Requirement: Public Content Pages Visual Refresh

Public content pages (`/library`, `/shared/[setId]`) SHALL receive glass-modern styling while remaining reachable for authenticated users.

**Constraint**: MUST

#### Scenario: Library page while authenticated

- **GIVEN** a user with a valid session
- **WHEN** user navigates to `/library`
- **THEN** the library page renders with updated styling and without redirect to `/dashboard`

---

### Requirement: Loading and Skeleton States

Loading placeholders and skeleton UI across the app SHALL use theme-aware glass styling consistent with the design system.

**Constraint**: MUST

#### Scenario: Dashboard loading skeleton

- **GIVEN** dashboard content is loading
- **WHEN** a skeleton or pulse placeholder displays
- **THEN** placeholder uses `bg-muted` or glass-compatible tokens readable in both light and dark themes

---

### Requirement: App and Public Layout Parity

The `(app)` and `(public)` route group layouts SHALL receive coordinated glass shell styling to prevent visual drift.

**Constraint**: MUST

#### Scenario: Public layout shell styling

- **GIVEN** a user views `/library` under `(public)/layout.tsx`
- **WHEN** the page renders
- **THEN** Navbar, Sidebar, and MobileNav use the same glass styling as the `(app)` layout
