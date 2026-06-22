# set-import Specification

## Purpose
Import flashcard sets and cards from CSV or JSON in a single atomic operation, with preview and row-level error reporting.

## Requirements

### Requirement: JSON Import
The system SHALL accept a JSON payload and create one FlashcardSet with all valid cards in a single database transaction.
**Constraint**: MUST
**Verification**: Unit test `test_import_json_valid()`, integration test `import.service.test.ts`

#### Scenario: Valid JSON Import
- **GIVEN** an authenticated user
- **WHEN** they POST `/api/v1/sets/import` with `{ format: "json", set: { title: "Vocab" }, cards: [{ front: "a", back: "b" }] }`
- **THEN** response 201 includes `{ data: { set, cardsCreated: 1 } }` and cards are queryable on the new set

#### Scenario: JSON Missing Title
- **GIVEN** an authenticated user
- **WHEN** they POST import JSON without `set.title`
- **THEN** API returns 400 `{ error: "VALIDATION_ERROR" }`

#### Scenario: JSON Card Limit Exceeded
- **GIVEN** an import payload with 501 cards
- **WHEN** POST `/api/v1/sets/import`
- **THEN** API returns 400 `{ error: "CARD_LIMIT_EXCEEDED" }` and no set is created

---

### Requirement: CSV Import
The system SHALL parse UTF-8 CSV with columns `front`, `back`, optional `example` and create set + cards atomically.
**Constraint**: MUST
**Verification**: Unit test `test_import_csv_valid()`, `test_import_csv_skips_blank_rows()`

#### Scenario: Valid CSV Import
- **GIVEN** CSV file with header `front,back,example` and 3 data rows
- **WHEN** user uploads via multipart POST with `format=csv` and `title=Imported`
- **THEN** 3 cards created; blank rows skipped; `skippedRows` count returned if any

#### Scenario: CSV Invalid Encoding
- **GIVEN** a non-UTF-8 CSV file
- **WHEN** import is attempted
- **THEN** API returns 400 `{ error: "INVALID_ENCODING" }`

#### Scenario: CSV Missing Required Column
- **GIVEN** CSV with only `front` column
- **WHEN** import is attempted
- **THEN** API returns 400 with row-level `details` indicating missing `back`

---

### Requirement: Import Payload Limits
The system SHALL reject imports exceeding 500 cards or 2MB file size (CSV multipart).
**Constraint**: MUST
**Verification**: Unit test `test_import_json_card_limit_exceeded()`, integration test for oversized file

#### Scenario: File Size Exceeded
- **GIVEN** a CSV upload larger than 2MB
- **WHEN** POST `/api/v1/sets/import` with `format=csv`
- **THEN** API returns 400 `{ error: "FILE_TOO_LARGE" }` and no set is created

---

### Requirement: Import Preview UI
The system SHALL show a preview table before confirming import (client parses for preview; server re-validates on submit).
**Constraint**: SHOULD
**Verification**: E2E `tests/e2e/import/import-set.spec.ts`

#### Scenario: Preview Before Confirm
- **GIVEN** user selects a valid CSV on `/sets/import`
- **WHEN** file is loaded
- **THEN** preview shows first 10 rows with front/back columns before Confirm button is enabled
