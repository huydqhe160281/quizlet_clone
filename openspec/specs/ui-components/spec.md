---
name: ui-components
description: Redesigned layout and UI primitives — presentation only, no logic changes.
version: 1.0.0
---

# UI Components Specifications

## ADDED Requirements

### Requirement: Navbar Redesign

The Navbar SHALL use glass-modern styling and include theme toggle, session-aware actions, and responsive layout.

**Constraint**: MUST

#### Scenario: Authenticated navbar

- **GIVEN** user is signed in
- **WHEN** Navbar renders in app layout
- **THEN** user sees glass-styled header with email/avatar area, theme toggle, and sign-out — without changing sign-out behavior or callback URL

#### Scenario: Unauthenticated navbar

- **GIVEN** user is not signed in
- **WHEN** Navbar renders
- **THEN** Sign in / Get started links remain functional with updated styling

---

### Requirement: Sidebar Redesign

The Sidebar SHALL display glass panel navigation with clear active-state indication for current route.

**Constraint**: MUST

#### Scenario: Active nav item

- **GIVEN** user is on `/sets/abc123`
- **WHEN** Sidebar renders
- **THEN** "My Sets" item shows active glass highlight; navigation hrefs unchanged

---

### Requirement: MobileNav Redesign

MobileNav SHALL provide bottom navigation on mobile viewports matching the glass design system.

**Constraint**: MUST

#### Scenario: Mobile bottom nav

- **GIVEN** viewport below `md` breakpoint
- **WHEN** app layout renders
- **THEN** MobileNav displays with glass background and icons matching Sidebar destinations

---

### Requirement: Dashboard Redesign

Dashboard components (StatsCards, DueCardsAlert, ActivityHeatmap, RecentSessions) SHALL use consistent glass card styling.

**Constraint**: MUST

#### Scenario: Dashboard data unchanged

- **GIVEN** dashboard page loads with stats payload
- **WHEN** DashboardClient renders
- **THEN** all numeric values and links display identically to before; only visual presentation differs

---

### Requirement: Study Set Card Redesign

Study set list cards SHALL use glass-modern card styling with hover elevation.

**Constraint**: MUST

#### Scenario: Set card navigation

- **GIVEN** sets list displays items
- **WHEN** user clicks a set card
- **THEN** navigation to `/sets/[setId]` works unchanged; card shows title, description, card count, visibility badge

---

### Requirement: Flashcard Redesign

FlashcardViewer SHALL retain 3D flip interaction and restyle card faces with glass-modern surfaces.

**Constraint**: MUST

#### Scenario: Flip behavior preserved

- **GIVEN** user is in flashcard study mode
- **WHEN** user clicks the card
- **THEN** Framer Motion flip animation runs; front/back content and `onFlip` callback behavior unchanged

---

### Requirement: Button Redesign

Button component SHALL extend CVA variants with glass-modern styles without changing variant names or `asChild` behavior.

**Constraint**: MUST

#### Scenario: Button variants

- **GIVEN** components use `default`, `outline`, `ghost`, `destructive` variants
- **WHEN** buttons render
- **THEN** all variants remain available with updated visual styling; click handlers unchanged

---

### Requirement: Input Redesign

Input and Textarea components SHALL match glass design system (border, focus ring, placeholder contrast).

**Constraint**: MUST

#### Scenario: Form input focus

- **GIVEN** user focuses an input in login or set form
- **WHEN** focus ring appears
- **THEN** ring uses `--ring` token with visible contrast in both themes; validation logic unchanged

---

### Requirement: Modal (Dialog) Redesign

Dialog component SHALL use glass overlay and panel styling.

**Constraint**: MUST

#### Scenario: Dialog open/close

- **GIVEN** a feature opens a Dialog (e.g., confirm delete)
- **WHEN** user interacts with overlay or close control
- **THEN** open/close behavior and Radix accessibility attributes unchanged

---

### Requirement: Dropdown Redesign

DropdownMenu component SHALL use glass panel styling for menu content.

**Constraint**: MUST

#### Scenario: Dropdown selection

- **GIVEN** a dropdown menu is opened
- **WHEN** user selects an item
- **THEN** `onSelect` / navigation behavior unchanged

---

### Requirement: Toast Notifications

The system SHALL integrate Sonner for toast notifications with a global Toaster in root layout.

**Constraint**: MUST

#### Scenario: Toast display

- **GIVEN** application code calls `toast.success()` or equivalent
- **WHEN** notification triggers
- **THEN** toast appears at configured position with glass-friendly styling

---

### Requirement: No Business Logic Changes

All component redesigns SHALL NOT alter props interfaces, hooks, API calls, or event handler semantics.

**Constraint**: MUST NOT

#### Scenario: Props contract preserved

- **GIVEN** any redesigned component
- **WHEN** compared to pre-change TypeScript props type
- **THEN** public props interface is identical (additive optional styling props discouraged)
