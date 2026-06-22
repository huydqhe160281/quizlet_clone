# SRS Delta: flashcard-app-v2

<!--
  Tier: SRS fragment — merge into flashcard-app-srs when archiving
  Parent: openspec/changes/flashcard-app-system-design/system_docs/srs/
-->

## New Functional Requirements

### FR-V2-01 Import
The system shall allow authenticated users to import flashcard sets from CSV or JSON files with server-side validation (max 500 cards per import).

### FR-V2-02 Study settings
The system shall provide a pre-study configuration screen: study mode, randomize order, cards per round (1–50), and optional wrong-card requeue within the same study run.

### FR-V2-03 Auth delivery
The system shall deliver password reset via email in production and expose a dev-only reset link when email is not configured.

### FR-V2-04 Session persistence
The system shall support "Remember me" login with configurable session duration (30 days vs 24 hours).

## Non-Functional

- Import transaction must complete or rollback entirely
- Round engine logic must be unit-testable without DB
- Dev reset URL must never appear in production API responses
