# Review Payload Schema

This file defines the canonical JSON schema and `VETO_CATEGORIES` for reviewer personas (e.g. `estimate-design-skeptic`, `estimate-analysis-reviewer`).

## `VETO_CATEGORIES`

An enum string used by the `veto_category` field to define the type of Pipeline Soft-Stop.

```typescript
type VetoCategory = 'scope_fidelity' | 'security' | 'architecture' | 'other';
```

## `ReviewPayload` JSON Schema

All reviewer personas MUST output this exact JSON structure when evaluating a proposal:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["PASS", "FAIL"],
      "description": "Overall verdict."
    },
    "coverage_score": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100,
      "description": "If status is FAIL due to scope fidelity, this MUST be 0."
    },
    "veto_category": {
      "type": "string",
      "enum": ["scope_fidelity", "security", "architecture", "other"],
      "description": "Categorizes the reason for a score of 0."
    },
    "veto_reason": {
      "type": "string",
      "maxLength": 255,
      "description": "Sanitized short description of the failure reason."
    },
    "feedback": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Detailed feedback items."
    }
  },
  "required": ["status", "coverage_score", "veto_category", "veto_reason", "feedback"]
}
```
