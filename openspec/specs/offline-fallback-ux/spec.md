# Specification: Offline Fallback UX

<!--
  Metadata: version 1.0, status: Draft
  Guidance: Define requirements and verification criteria using engine layers and Gherkin scenarios.
-->

## Purpose

In-app offline fallback shell with vi/en/ja copy when navigation fails offline.

## Capability Summary

When navigation fails offline, learners see an in-app offline page with vi/en/ja copy instead of only the browser’s generic error screen.

## Engine Layer Map

| Layer     | Area         | Component/Symbol                                        |
| --------- | ------------ | ------------------------------------------------------- |
| Interface | Static shell | `public/offline.html` (SW navigateFallback)             |
| Interface | App Router   | `src/app/offline/page.tsx` (optional online `/offline`) |
| Interface | SW           | Navigation fallback URL → `/offline.html`               |
| Interface | i18n         | `messages/{vi,en,ja}/pwa.json` (`pwa.*`)                |

---

## Requirements

### Requirement: Offline Fallback Route

The system SHALL expose a dedicated offline shell at **`/offline.html`** (`public/offline.html`) that the service worker uses as the **navigation fallback** when a same-origin document request fails while offline (after the offline document has been precached). The shell SHALL explain that connectivity is required for study/sync features in Phase 1 and offer a control to retry/reload. An App Router page at `/offline` MAY exist for online visits but MUST NOT be the SW navigateFallback.

**Constraint**: MUST  
**Verification**: `public/offline.html` exists; SW config references `/offline.html`; smoke: DevTools offline + hard navigation

#### Scenario: Offline navigation shows product page

- **GIVEN** an activated Phase 1 service worker and a prior online visit that installed the offline fallback
- **WHEN** the browser is offline and the user navigates to a same-origin app URL that cannot be fetched
- **THEN** the user is shown the in-app `/offline.html` experience (not solely the browser default error page)

#### Scenario: Cold first visit offline accepted

- **GIVEN** no prior successful online visit (SW/precache not installed)
- **WHEN** the user opens the site while offline
- **THEN** Phase 1 does not require an in-app offline page (browser default is acceptable)

#### Scenario: Offline page offers retry

- **GIVEN** the user is viewing the offline shell (`/offline.html` or online `/offline`)
- **WHEN** they activate the retry/reload control
- **THEN** the client attempts to reload/navigate so that restoring connectivity can recover the app

### Requirement: Offline Copy Locale Parity

New offline and update-related user-visible strings SHALL live in **`messages/{vi,en,ja}/pwa.json`** under the `pwa` namespace, MUST be registered in `src/lib/i18n/catalog.ts` (`CATALOG_FILES`), and MUST exist in **vi**, **en**, and **ja** with parity. Required keys include offline title/body, reload/retry, update-available, update-reload-warning, study-needs-network, offline-prerequisite, and iOS install hint. Copy SHOULD state that learning/sync needs a network in Phase 1. The SW fallback shell (`/offline.html`) SHALL resolve locale via `app-locale` cookie and/or `localStorage` after load (not a single baked precache locale). Catalog strings embedded in `offline.html` MUST stay in parity with `pwa.json` (guarded by tests).

**Constraint**: MUST  
**Verification**: Locale catalog parity test; `loadCatalog` resolves `pwa.*`; offline-html drift test

#### Scenario: Locale catalog parity (pwa keys)

- **GIVEN** Phase 1 adds offline/update strings in `pwa.json` and `CATALOG_FILES` includes `pwa.json`
- **WHEN** `vi`, `en`, and `ja` catalogs are compared for the new `pwa.*` keys
- **THEN** every new key is present in all three locales and resolvable via `loadCatalog`

#### Scenario: Offline fallback respects active locale offline

- **GIVEN** the learner’s preferred locale cookie is `en` (or `ja`) and `/offline.html` is served via navigateFallback
- **WHEN** the offline shell applies locale client-side
- **THEN** visible copy uses that locale’s `pwa.*` strings (not a fixed default-locale-only precache)

#### Scenario: Offline body mentions connectivity for study

- **GIVEN** the offline page is rendered in any supported locale
- **WHEN** the body copy is shown
- **THEN** it indicates that study features require connectivity (Phase 1 limitation)

#### Scenario: Offline page states online prerequisite

- **GIVEN** the offline page is rendered
- **WHEN** the body/prerequisite copy is shown
- **THEN** it indicates that the offline shell requires at least one prior online visit

#### Scenario: Offline page includes iOS install hint

- **GIVEN** the offline page is rendered
- **WHEN** install/guidance copy is shown
- **THEN** an iOS Add to Home Screen hint is available in vi/en/ja (footer or secondary text)

---

## Out of Scope

- Making Dashboard / Today / Search fully functional offline
- Offline Flashcard/Learn session UI
- Persistent online/offline indicator (optional nice-to-have, not required)
- Guaranteeing a native Chromium install prompt on iOS
