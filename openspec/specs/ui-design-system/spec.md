---
name: ui-design-system
description: Glass-modern design tokens, theme provider, and shared visual utilities.
version: 1.0.0
---

# UI Design System Specifications

## ADDED Requirements

### Requirement: Unified Design Tokens

The system SHALL define a unified design token set covering color, typography, spacing, border radius, and shadow for both light and dark themes, including `--popover` and `--popover-foreground` used by DropdownMenu.

**Constraint**: MUST

#### Scenario: Light theme tokens

- **GIVEN** the app loads with light theme active
- **WHEN** any page renders
- **THEN** CSS variables (`--background`, `--foreground`, `--primary`, `--card`, `--border`, `--radius`) resolve from `:root` in `globals.css`

#### Scenario: Dark theme tokens

- **GIVEN** the user selects dark theme or system prefers dark
- **WHEN** `<html>` receives class `dark`
- **THEN** all semantic color tokens resolve from the `.dark` block with sufficient contrast for text and interactive elements

---

### Requirement: Glass Surface Utilities

The system SHALL provide reusable glass-modern surface styles (semi-transparent background, backdrop blur, soft border, elevated shadow).

**Constraint**: MUST

#### Scenario: Glass panel rendering

- **GIVEN** a component applies the `glass-panel` utility class
- **WHEN** rendered on a supported browser
- **THEN** the surface displays with `backdrop-blur`, reduced-opacity background, and subtle border/shadow consistent with the active theme

#### Scenario: Backdrop filter fallback

- **GIVEN** the browser does not support `backdrop-filter`
- **WHEN** a glass surface renders
- **THEN** the surface falls back to solid `bg-card` without broken layout

---

### Requirement: Subtle Motion

The system SHALL apply subtle transitions (fade, scale, hover) with duration 150–300ms on interactive elements. Framer Motion SHALL be limited to flashcard flip and optional page enter; other interactions use CSS transitions.

**Constraint**: MUST

#### Scenario: Transition duration bound

- **GIVEN** an interactive element with hover transition
- **WHEN** the transition runs
- **THEN** duration is between 150ms and 300ms unless reduced-motion applies

#### Scenario: Reduced motion preference

- **GIVEN** the user has `prefers-reduced-motion: reduce`
- **WHEN** interactive elements render
- **THEN** non-essential animations are disabled or minimized

---

### Requirement: Responsive Layout

The system SHALL maintain usable layouts at mobile (≥375px), tablet (≥768px), and desktop (≥1280px) breakpoints.

**Constraint**: MUST

#### Scenario: Mobile navigation

- **GIVEN** viewport width below `md` breakpoint
- **WHEN** user navigates authenticated app
- **THEN** Sidebar is hidden and MobileNav bottom bar is visible with touch-friendly targets

#### Scenario: Tablet layout

- **GIVEN** viewport width between 768px and 1279px
- **WHEN** user navigates authenticated app
- **THEN** Sidebar is visible and main content area uses appropriate padding without horizontal overflow

#### Scenario: Desktop layout

- **GIVEN** viewport width ≥1280px
- **WHEN** user navigates authenticated app
- **THEN** full shell (Sidebar + Navbar + main) displays with glass styling and readable content width
