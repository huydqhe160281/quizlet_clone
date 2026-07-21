# optimize-perf-playbook Specification

## Purpose

SSOT constants and layered Performance → UX → UI → Structure apply playbook for surgical optimization changes (batch file budget, findings cap, observe-before-implement, spec sync on user-facing behavior).

## Requirements

### Requirement: Playbook Constants (SSOT)

The change MUST treat the following limits as the single source of truth for apply batches (do not invent alternate thresholds in tasks):

| Constant                    | Value | Meaning                                                                                   |
| --------------------------- | ----- | ----------------------------------------------------------------------------------------- |
| `BATCH_FILE_BUDGET`         | 5     | Max application source files edited per implement batch (unless user widens)              |
| `FINDINGS_CAP`              | 8     | Max Findings listed per Observe                                                           |
| `OBSERVE_LINES`             | 5–8   | Lines of Observe notes before implement                                                   |
| `LIST_VIRTUALIZE_THRESHOLD` | 50    | Approximate item count above which lists should use `VirtualList` when Observe shows cost |

#### Scenario: Tasks cite SSOT constants

- **GIVEN** an implement or observe task is written for this change
- **WHEN** it constrains batch size, findings count, observe length, or list virtualization
- **THEN** it references these SSOT values (or equivalent wording) rather than inventing new numeric limits

---

### Requirement: Layered Optimization Playbook

The apply process for this change MUST follow Performance → UX → UI → Structure ordering, producing Observe notes (`OBSERVE_LINES`) and at most `FINDINGS_CAP` prioritized Findings before code edits, and MUST limit each implement batch to `BATCH_FILE_BUDGET` files unless the user explicitly widens scope.

#### Scenario: Observe before implement

- **GIVEN** an apply batch is about to start for a priority surface
- **WHEN** the agent prepares work
- **THEN** it records Observe (flow, hotspots, risk) and Findings with `[P0]|[P1]|[P2]` before modifying application code

#### Scenario: Layer order is not skipped

- **GIVEN** open P0 Findings still exist for an earlier layer (e.g. Performance)
- **WHEN** the agent chooses the next implement batch
- **THEN** it MUST NOT implement a later layer (e.g. UI token edit) before Observing/clearing or explicitly deferring those earlier-layer P0s in the Report

#### Scenario: Findings cap truncates

- **GIVEN** Observe surfaces more than `FINDINGS_CAP` candidate issues
- **WHEN** the agent writes the Findings list
- **THEN** at most `FINDINGS_CAP` items are listed as Findings and the remainder are deferred to the apply Report “Chưa làm / Next” (or a follow-up Observe)

#### Scenario: Batch file budget hard stop

- **GIVEN** Findings include multiple P0/P1 items
- **WHEN** an implement batch would require editing more than `BATCH_FILE_BUDGET` application source files
- **THEN** the agent MUST stop, leave remaining items for a later batch, and MUST NOT rationalize a larger batch without explicit user approval in-session

#### Scenario: Service-layer before mode-file fan-out

- **GIVEN** a P0 session/idempotency finding whose d≈1 callers include multiple study mode files
- **WHEN** the first implement batch runs
- **THEN** it prefers a shared service/hook/lib fix within `BATCH_FILE_BUDGET`; per-mode file touches are deferred to subsequent batches of at most `BATCH_FILE_BUDGET` mode files each (e.g. 3 then 2), never one unbounded fan-out

#### Scenario: Exceptional Prisma/API change stays budgeted

- **GIVEN** Observe proves Prisma schema or public API contract change is the sole root cause of a P0
- **WHEN** that fix is implemented
- **THEN** migration + schema + caller updates count toward `BATCH_FILE_BUDGET` (or the work is split across batches); the Report MUST document root cause, migration name, and rollback note — no silent in-batch exception

---

### Requirement: Spec Sync On User-Facing Behavior Change

The system MUST update the relevant OpenSpec delta/main specs when user-facing behavior changes; structure-only cleanups without behavior change do not require behavior delta updates.

#### Scenario: Behavior change updates spec

- **GIVEN** an implement batch changes learner-visible dashboard priority, study feedback/resume, or token/primitive usage
- **WHEN** the batch is completed
- **THEN** the corresponding capability spec (`dashboard-search-library`, `study-modes`, and/or `ui-design-system`) is updated to match

#### Scenario: Structure-only skip

- **GIVEN** a batch only moves logic across feature boundaries without changing user-visible behavior
- **WHEN** the batch is completed
- **THEN** no behavior-requirement delta is required solely for the move

#### Scenario: New capability lives under main specs after archive

- **GIVEN** capability `optimize-perf-playbook` was introduced by a change
- **WHEN** that change is archived with spec sync
- **THEN** the authoritative text lives at `openspec/specs/optimize-perf-playbook/spec.md`
