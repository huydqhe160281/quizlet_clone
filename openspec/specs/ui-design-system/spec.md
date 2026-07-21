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

#### Scenario: Subtle border radius scale

- **GIVEN** `--radius` is defined in `globals.css` (default `0.75rem`)
- **WHEN** components use Tailwind radius classes
- **THEN** `sm`/`md`/`lg`/`xl`/`2xl`/`3xl` resolve from that token via `tailwind.config.ts` and stay within ~8–16px (no pill-like panels except intentional `rounded-full`)

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

---

### Requirement: Token And Primitive Reuse On Touched Surfaces

The system MUST reuse existing design tokens and shared UI primitives on touched surfaces. **Definition — touched:** application source files edited in an implement batch (within `BATCH_FILE_BUDGET` from `optimize-perf-playbook`). When UI on Dashboard, study, or CardEditor is changed under an optimization change, the system MUST use shared primitives (`Button`, `Card`, `Dialog`, `Input`, `Select`, `Tabs`, `DropdownMenu`) and MUST NOT invent one-off colors, radii, or stacked shadows that bypass tokens.

#### Scenario: Touched study chrome uses tokens

- **GIVEN** a study mode chrome surface file is touched in the current batch for UI simplification
- **WHEN** it renders in light or dark theme
- **THEN** colors, radius, and elevation resolve from existing tokens / shared primitives rather than hard-coded one-off values that break theme contrast

#### Scenario: No decorative card-in-card without interaction need

- **GIVEN** a layout change on a touched surface
- **WHEN** a container uses card styling
- **THEN** the card exists only when it aids an interaction or understanding; nested card-in-card without purpose is not introduced

---

### Requirement: Study Chrome Focus On Card Content

The system MUST keep study mode chrome minimal so primary attention stays on card/question content.

#### Scenario: Primary content dominates study viewport

- **GIVEN** a learner is mid-session in a study mode
- **WHEN** the mode UI is shown
- **THEN** navigation/settings chrome does not obscure or dominate the card content area on mobile-sized viewports

---

### Requirement: Soft Radius Token Ladder

The system MUST keep Tailwind `borderRadius` tokens aligned to the CSS `--radius` base so touched panels use a soft ladder (`sm`…`3xl`) rather than inventing one-off pixel radii. The ladder MUST remain non-pill (no `rounded-full` as the default panel radius).

#### Scenario: Radius tokens derive from --radius

- **GIVEN** `--radius` is defined in the theme CSS variables
- **WHEN** `tailwind.config.ts` maps `borderRadius` keys
- **THEN** `sm`/`md`/`lg`/`xl`/`2xl`/`3xl` resolve via calc offsets from `--radius`, and panel classes on touched surfaces prefer these tokens over hard-coded arbitrary radii
