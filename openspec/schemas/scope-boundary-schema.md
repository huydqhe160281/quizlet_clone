# Scope Boundary Taxonomy Schema

This file defines the canonical taxonomy and constants for Scope Boundary extraction and heuristic filtering within the estimation pipeline.

## 1. Constants

- **`SCOPE_GATE_BUDGET`**: 60s, 8000 tokens (Maximum latency and token limit for the step 4a extraction gate generation).
- **`HITL_FALLBACK_SECS`**: 300s (Maximum wait time for interactive user confirmation before auto-aborting the run in CI mode).

### `SCOPE_KEYWORDS`

Signals used by step 4a to extract boundaries from raw input:

```json
{
  "jp": ["作業範囲", "基幹側", "対象外"],
  "en": ["scope", "deliverables", "external API"],
  "vn": ["phạm vi", "team khác", "ngoài phạm vi"]
}
```

## 2. Taxonomy Tags

All personas performing ownership heuristic filtering MUST use these exact tags. These tags are mutually exclusive.

- `[IN-SCOPE GAP]`: A functional or technical requirement that is missing from the inputs and MUST be built by the current project team (falls under Build Scope).
- `[EXTERNAL DEPENDENCY]`: A requirement, component, or API that is owned, built, or operated by a different team or system (falls under Consume Scope). The current team will only call/integrate with it.
- `[NEW_GAP]`: A newly discovered requirement that is explicitly not part of the current architecture or inputs, but has not yet been classified as Build or Consume. It requires human clarification before being assigned to IN-SCOPE or EXTERNAL DEPENDENCY.

> **Note to Persona Implementers**: Future additions to the scope taxonomy MUST be defined in this schema file before they can be used in persona markdown prompts.
