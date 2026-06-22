# Implementation Tasks: <Change Name>

> **Phase-Based Structure**: When `decomposition.md` defines implementation phases, structure tasks using `## Phase N: <name>` headers matching the phase definitions. Each phase section should contain tasks scoped to that phase's boundaries.

> **TDD Enforcement Note**: The `opsx` CLI automatically enforces the RED -> GREEN -> REFACTOR state machine. Your tests MUST output the exact `Scenario: <name>` string to pass the Anti-Cheat Traceability Gate.

## Phase 1: [Phase Name from Decomposition]

**Objective**: [From decomposition phase objective]
**Boundaries**: [From decomposition phase boundaries]

- [ ] Write a failing test for `Scenario: [Target Scenario]`.
- [ ] Implement the minimal logic for Phase 1.
- [ ] Run tests to pass.

## Phase 2: [Phase Name from Decomposition]

**Objective**: [From decomposition phase objective]
**Boundaries**: [From decomposition phase boundaries]

- [ ] Write a failing test for `Scenario: [Target Scenario]`.
- [ ] Implement the logic.
- [ ] Run tests to pass.

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

## Verification Checklist

<!--
  INSTRUCTION FOR AI: DO NOT output generic items.
  Every item MUST be a specific, verifiable test related to a task above.
  Ensure major architectural or logic tasks have corresponding verification items.
-->

- [ ] **MUST**: All logical gaps identified by the skeptic agent (if any) are addressed.
- [ ] **MUST**: Non-functional constraints (D4) identified by the guardian agent are satisfied.
- [ ] **MUST**: Run `diff_impact({scope: "staged"})` to verify change radius.
- [ ] **MUST**: Execute `/opsx-checkpoint` and verify human-in-the-loop comprehension.
- [ ] [Add change-specific verification item]
