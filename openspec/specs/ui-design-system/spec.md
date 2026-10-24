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

#### Scenario: Theme registry is the single source of truth

- **GIVEN** `src/lib/theme/themes.ts` lists every theme (`id`, `labelKey`, `colorScheme`)
- **WHEN** the app renders
- **THEN** next-themes `themes`, the `ThemeToggle` menu, the `ThemePicker` tiles, Sonner's light/dark mapping and Tailwind's `dark:` selector (every `colorScheme: 'dark'` theme) are all derived from it, and `THEME_ICONS` (`Record<ThemeChoice, LucideIcon>`) fails to compile until a new theme has an icon
- **AND** each non-base theme's tokens and component skin live in `src/styles/themes/<name>.css`, imported in `app/layout.tsx` after `globals.css` so they win over utilities at equal specificity
- **AND** `ThemePicker` swatches carry the theme's class and preview its real `--background` / `--primary` tokens (`:root, .light` hold the base tokens)

#### Scenario: Shared theme hooks

- **GIVEN** a theme skin needs to restyle a component
- **WHEN** it targets that component
- **THEN** it uses `data-slot` hooks only: shadcn primitives (`button` + `data-variant`, `card`, `input`, `checkbox`, `tabs-list`/`tabs-trigger`, `popover`, `dialog`, `dialog-overlay`, `slider-track`/`slider-thumb`) and feature slots `flashcard-face`, `accent-surface` (flashcard back, round banner), `answer-option`, `well`, `progress-track`, `tile` (SetCard)
- **AND** shared decorations are switched by trait tokens instead of per-theme selectors in components: `.page-backdrop` (`--page-backdrop`), `.decor-backdrop` (`--decor-backdrop`), `.decor-glow` (`--decor-glow`), `.decor-orbs` (`--decor-orbs`, hidden by default); `.decor-tape` / `.decor-highlight` are no-ops unless a theme styles them

#### Scenario: Pastel theme (Soft UI + claymorphism)

- **GIVEN** the user picks "Pastel"
- **WHEN** `<html>` receives class `pastel`
- **THEN** semantic tokens resolve from `src/styles/themes/pastel.css` (cream base, peach primary, dusty-blue secondary, `--radius: 1.25rem`) and `body` shows a soft mesh gradient
- **AND** the shared hooks get soft/clay surfaces; the theme hides `decor-backdrop` and shows `decor-orbs` (PastelOrbs)

#### Scenario: Paper & Ink theme (editorial notebook, light + dark)

- **GIVEN** the user picks "Paper & Ink" or "Paper & Ink Dark"
- **WHEN** `<html>` receives class `paper` or `paper-dark`
- **THEN** tokens resolve from `src/styles/themes/paper.css` (cream paper `#FAF8F1` / night paper, navy ink text, learning-green primary, `#5B5BD6` focus ring, `--radius: 0.625rem`, plus `--paper-*` outline, rule, sticky, scrim, ink-surface, shadow, motion and font tokens); `body` uses Be Vietnam Pro (`--font-paper`) over faint horizontal rules
- **AND** the shared hooks get thin ink outlines and flat offset shadows; sticky-yellow offsets are reserved for the flashcard, dialogs and hovered/active items; elements whose box-shadow the skin replaces show focus as an outline
- **AND** the flashcard front is a ruled index card, `accent-surface` is an ink sheet (cream in dark); `decor-backdrop` and `decor-glow` are hidden and gradient-clipped text renders as solid ink
- **AND** `paper-dark` has `colorScheme: 'dark'`, so Tailwind `dark:` utilities and Sonner's dark mode apply under it

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
- **THEN** Sidebar is hidden and MobileNav bottom bar is visible with touch-friendly targets, except on study screens (see "Mobile study focus mode")

#### Scenario: Mobile study focus mode

- **GIVEN** viewport width below `sm` breakpoint (MobileNav range)
- **WHEN** the user is on a study screen `/sets/[setId]/(flashcard|learn|write|test|draw)` (`isStudySessionPath` in `src/lib/navigation/study-focus.ts`)
- **THEN** MobileNav is not rendered and the guide chat FAB is hidden, so the card and its controls fit the viewport
- **AND** the study header's Exit control remains the way back; every other app route (including `/sets/[setId]`) keeps MobileNav

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
