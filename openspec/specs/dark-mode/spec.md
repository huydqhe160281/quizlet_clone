---
name: dark-mode
description: Theme switching with Light, Dark, and System modes and persistence.
version: 1.0.0
---

# Dark Mode Specifications

## ADDED Requirements

### Requirement: Theme Provider

The system SHALL wrap the application in a theme provider supporting `light`, `dark`, and `system` modes using class-based dark mode (`dark` class on `<html>`).

**Constraint**: MUST

#### Scenario: System theme follow

- **GIVEN** user selects "System" theme
- **WHEN** OS color scheme changes
- **THEN** the app theme updates to match without page reload

---

### Requirement: Theme Persistence

The system SHALL persist the user's theme preference in localStorage under key `flashcards-theme` (configured via `next-themes` `storageKey`).

**Constraint**: MUST

#### Scenario: Preference survives reload

- **GIVEN** user selects dark theme
- **WHEN** user closes and reopens the app
- **THEN** `<html>` receives `suppressHydrationWarning` and theme class is applied via `next-themes` to minimize incorrect flash on first paint

---

### Requirement: Theme Toggle Control

The system SHALL expose a theme toggle in the Navbar accessible on desktop and mobile.

**Constraint**: MUST

#### Scenario: Cycle theme modes

- **GIVEN** user clicks the theme toggle
- **WHEN** the control activates
- **THEN** theme cycles through light → dark → system (or equivalent dropdown) and UI updates immediately

---

### Requirement: Sonner Integration

The Sonner Toaster SHALL be a client component using `useTheme()` from `next-themes` for `theme` prop sync (not hard-coded).

**Constraint**: MUST

#### Scenario: Toast position responsive

- **GIVEN** viewport is desktop width
- **WHEN** a toast displays
- **THEN** toast appears at bottom-right

#### Scenario: Toast position mobile

- **GIVEN** viewport is below `md` breakpoint
- **WHEN** a toast displays
- **THEN** toast appears at top-center

---

### Requirement: Sonner Theme Sync

The toast system SHALL sync its appearance with the active theme.

**Constraint**: MUST

#### Scenario: Toast in dark mode

- **GIVEN** dark theme is active
- **WHEN** a toast notification displays
- **THEN** toast styling matches dark palette (readable text, appropriate background)
