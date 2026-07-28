# SRS Delta — Adaptive Learning Coach (Phase 1)

## 1. Introduction

This delta adds product requirements for a daily adaptive learning planner (“Today”) that turns existing spaced-repetition progress into a prioritized queue, daily card goal, retention insights, and a single recommended study action.

## 2. Functional Requirements

| ID        | Requirement                                                                                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-ALC-01 | Authenticated users SHALL access a Today surface at `/today` showing goal progress, learning queue, retention insights, and a primary study CTA.                            |
| FR-ALC-02 | The system SHALL expose `GET /api/v1/today` returning `goal`, `queue`, `insights`, and `recommendation` for the current user only.                                          |
| FR-ALC-03 | The learning queue SHALL include owned-set **due**, **weak**, and **new** cards with deterministic ranking and a default cap of 30 (max 50).                                |
| FR-ALC-04 | Weak cards SHALL be cards not already due that have `easeFactor < 2.0` or a recent `{AGAIN, HARD}` review within 7 UTC days.                                                |
| FR-ALC-05 | Users SHALL configure `dailyGoalCards` (integer 1–200, default 20) via `PATCH /api/v1/user/study-goals`.                                                                    |
| FR-ALC-06 | Goal progress for “today” SHALL count `ReviewHistory` rows in the current UTC day only (session answers MUST NOT double-count in Phase 1).                                  |
| FR-ALC-07 | Retention insights SHALL include 7-day review count, 7-day accuracy (GOOD+EASY), effective streak, and up to 3 weak sets.                                                   |
| FR-ALC-08 | Recommendation SHALL compose existing entry points: multi-set/due → spaced repetition; single-set dominance → LEARN session on that set; empty → My Sets / create guidance. |
| FR-ALC-09 | Loading Today SHALL NOT auto-create a `StudySession`.                                                                                                                       |
| FR-ALC-10 | Dashboard due-card alert CTA SHALL navigate to `/today` when due cards exist.                                                                                               |
| FR-ALC-11 | Today UI chrome SHALL be localized via vi/en/ja message catalogs.                                                                                                           |
| FR-ALC-12 | Sidebar and MobileNav SHALL include a Today navigation item for authenticated layouts.                                                                                      |

## 3. Non-Functional Requirements

| ID         | Requirement                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-ALC-01 | Queue and Today aggregate queries SHALL remain index-friendly (reuse `(userId, dueDate)`) and return within interactive latency for typical personal libraries. |
| NFR-ALC-02 | Ranking SHALL be deterministic and unit-testable (stable tie-break).                                                                                            |
| NFR-ALC-03 | Goal and streak day boundaries SHALL use the same UTC day helpers as existing `UserStats` streak logic.                                                         |
| NFR-ALC-04 | Today APIs SHALL require authentication; users MUST only read/write their own goals and queue data.                                                             |
| NFR-ALC-05 | Phase 1 MUST NOT introduce cross-set `StudySession` rows or replace the SM-2 algorithm.                                                                         |

## 4. Out of Scope

PWA/offline sync, push/email reminders, minutes-based goals UI, per-user timezone preference, classroom/social features, document AI import, LLM-ranked queues, multi-week curriculum builder.
