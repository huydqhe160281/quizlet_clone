# ai-draft-lifecycle Specification

## Purpose

TBD - created by archiving change ai-set-generation. Update Purpose after archive.

## Requirements

### Requirement: Draft saved as PRIVATE

All AI-generated sets SHALL be created with `visibility: PRIVATE` regardless of user default preferences.
**Constraint**: MUST
**Verification**: Service test asserts visibility on create.

#### Scenario: Draft visibility

- **GIVEN** successful AI generation
- **WHEN** set is persisted
- **THEN** `visibility === 'PRIVATE'`

### Requirement: Discard deletes draft

When user clicks Discard in preview, the client SHALL call `DELETE /api/v1/sets/{setId}` and close the modal without navigation.
**Constraint**: MUST
**Verification**: Component test mocks DELETE; set removed from DB.

#### Scenario: User discards draft

- **GIVEN** preview for draft set `xyz789` owned by user
- **WHEN** user clicks Discard
- **THEN** DELETE succeeds, modal closes, set no longer in user's list

### Requirement: Confirm without mutation

Confirm SHALL NOT require an additional API call — draft already exists; navigation alone completes the flow.
**Constraint**: MUST
**Verification**: No PATCH/POST on confirm in client code.

#### Scenario: Confirm is navigation only

- **GIVEN** draft already saved
- **WHEN** user clicks Confirm
- **THEN** only client-side navigation occurs

### Requirement: Owner-only discard

Discard SHALL fail with 403 if the set is not owned by the authenticated user (via existing `deleteSet` guard).
**Constraint**: MUST
**Verification**: Existing `deleteSet` tests cover ownership.

#### Scenario: Non-owner cannot discard

- **GIVEN** draft set owned by user A
- **WHEN** user B calls DELETE on that set id
- **THEN** response is 403

### Requirement: Orphaned draft on modal dismiss

If the user closes the AI modal without Confirm or Discard, the PRIVATE draft SHALL remain in the database. No automatic cleanup in v1.
**Constraint**: MUST
**Verification**: Cross-spec with modal UI; integration test.

#### Scenario: Draft persists after modal close

- **GIVEN** AI generation created draft set `draft1` for user U
- **WHEN** user closes the modal without Discard
- **THEN** `draft1` still exists and is owned by user U

---
