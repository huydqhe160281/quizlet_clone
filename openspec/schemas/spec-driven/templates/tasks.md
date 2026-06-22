# Implementation Tasks: <Change Name>

> **TDD Enforcement Note**: The `opsx` CLI automatically enforces the RED -> GREEN -> REFACTOR state machine. Your tests MUST output the exact `Scenario: <name>` string to pass the Anti-Cheat Traceability Gate.

## Phase 1: Core Types (`core`)

**Target Scenarios:**

- Scenario: [Insert Core Type Target Scenario]

- [ ] Write a failing test for `Scenario: [Insert Core Type Target Scenario]`.
- [ ] Run the tests to unlock `GREEN` state.
- [ ] Implement the minimal logic for Phase 1.
- [ ] Run tests to pass and unlock `REFACTOR` state.
- [ ] Refactor code.

## Phase 2: Service / Repository Layer

**Target Scenarios:**

- Scenario: [Insert Service Target Scenario]

- [ ] Write a failing test for `Scenario: [Insert Service Target Scenario]`.
- [ ] Run the tests to unlock `GREEN` state.
- [ ] Implement the service logic.
- [ ] Run tests to pass and unlock `REFACTOR` state.
- [ ] Refactor code.

## Phase 3: Handler / Integration Layer (`daemon` / `mcp-backend`)

**Target Scenarios:**

- Scenario: [Insert Handler Target Scenario]

- [ ] Write a failing test for `Scenario: [Insert Handler Target Scenario]`.
- [ ] Run the tests to unlock `GREEN` state.
- [ ] Implement integration logic.
- [ ] Run tests to pass and unlock `REFACTOR` state.
- [ ] Refactor code.

## Phase 4: Documentation

- [ ] Update docs listed in Documentation Impact Analysis

## Surface Documentation (README / ROADMAP / DESIGN)

<!-- Evaluate whether this change affects project-level documentation. If N/A, mark N/A and explain briefly. -->

- [ ] **README.md** (Update ONLY if):
  - Alters Quick Start / CLI commands (CRITICAL)
  - Alters high-level Architecture description
  - Bumps a major project metric (e.g., Agent count)
- [ ] **ROADMAP.md** (Choose ONE strategy):
  - **[Partial Epic]** Part of an existing planned Epic: Mark Epic as `[-]` and append a nested `- [x] <Change Name>: <Summary>` below it.
  - **[Epic Completion]** Finishes an existing Epic 100%: Mark the Epic as `[x]`.
  - **[Unplanned Feature]** New feature not in Roadmap: Insert it as an `[x]` item under the most logically appropriate existing `##` Section. Do NOT create new `##` sections.
  - **[Deprecation/Pivot]** Canceling a planned item: Strike it through (`~~[ ] Item~~`) and append `*(Pivoted to <Change Name>)*`. DO NOT delete the line.
  - Always update the "Cập nhật lần cuối" date.
- [ ] **DESIGN.md** (Update ONLY if):
  - Adds a new UI component with distinct visual styling
  - Modifies the project's visual theme, color scheme, or design language
  - Introduces a new page, route, or layout pattern
  - Changes responsive behavior or breakpoint strategy
  - Choose ONE strategy:
    - **[Token Update]** Design tokens changed (colors, fonts, spacing): Instruct agents to update the source CSS/Config and invoke the `design-md` skill (rather than manually editing the YAML frontmatter).
    - **[New Component]** New UI component added: Append new definitions inside a `<!-- [MANUAL] -->` block in `## 4. Component Stylings` to ensure they survive automated regeneration.
    - **[Theme Revision]** Visual theme or atmosphere shifted: Rewrite `## 1. Visual Theme & Atmosphere` and update affected color/typography sections within `<!-- [MANUAL] -->` blocks.
    - **[Constraint Addition]** New design rule discovered: Append to `## 7. Do's and Don'ts` within the `<!-- [MANUAL] -->` block with constraint-focused phrasing.

## Verification Checklist

<!--
  INSTRUCTION FOR AI: DO NOT output generic items.
  Every item MUST be a specific, verifiable test related to a task above.
  Ensure major architectural or logic tasks have corresponding verification items.
  Fail if verification items are generic boilerplate (e.g., 'all gaps addressed').
-->

- [ ] **MUST**: All logical gaps identified by the skeptic agent (if any) are addressed.
- [ ] **MUST**: Non-functional constraints (D4) identified by the guardian agent are satisfied.
- [ ] **MUST**: Run `diff_impact({scope: "staged"})` to verify change radius.
- [ ] **MUST**: Execute `/opsx-checkpoint` and verify human-in-the-loop comprehension.
- [ ] [Add change-specific verification item]
