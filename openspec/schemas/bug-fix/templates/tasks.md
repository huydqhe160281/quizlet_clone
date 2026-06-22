## Spec Updates

<!--
  INSTRUCTION FOR AI: If `root-cause.md` indicates a Spec Impact, you MUST explicitly list the delta spec tasks here.
  You MUST physically create the delta spec file on disk BEFORE proceeding to implementation.
-->

- [ ] SPEC: Draft delta spec at `openspec/changes/<name>/specs/<capability>/spec.md` (if applicable)

## Implementation Tasks

> **TDD Enforcement Note**: The `opsx` CLI automatically enforces the RED -> GREEN -> REFACTOR state machine. Your tests MUST output the exact `Scenario: <name>` string to pass the Anti-Cheat Traceability Gate.

**Target Scenarios:**

- Scenario: Reproduce the reported bug

- [ ] Write a failing test for `Scenario: Reproduce the reported bug`.
- [ ] Run the tests to unlock `GREEN` state.
- [ ] Implement the minimal fix.
- [ ] Run tests to pass and unlock `REFACTOR` state.
- [ ] Refactor and remove incidental complexity.

## Verification Checklist

<!--
  INSTRUCTION FOR AI: DO NOT output generic items.
  Every item MUST be a specific, verifiable test related to a task above.
  Ensure major architectural or logic tasks have corresponding verification items.
  Fail if verification items are generic boilerplate (e.g., 'all gaps addressed').
-->

- [ ] **MUST**: Run `diff_impact({scope: "staged"})` before committing.
- [ ] Run the targeted regression command for this bug.
- [ ] Run the relevant broader validation command(s).
- [ ] [Add change-specific verification item]
