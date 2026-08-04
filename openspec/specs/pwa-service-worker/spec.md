# Specification: PWA Service Worker

<!--
  Metadata: version 1.0, status: Draft
  Guidance: Define requirements and verification criteria using engine layers and Gherkin scenarios.
-->

## Purpose

Production Serwist service worker: precache shell, safe NetworkOnly document/API caching, update prompt, CSP worker-src.

## Capability Summary

Production builds register a Serwist service worker that precaches the app shell, applies safe runtime caching, and prompts users to reload when an update is waiting.

## Engine Layer Map

| Layer     | Area        | Component/Symbol                                      |
| --------- | ----------- | ----------------------------------------------------- |
| Interface | Next config | `@serwist/next` wrapper / SW build injection          |
| Interface | SW entry    | Serwist worker (e.g. `src/app/sw.ts` or project path) |
| Interface | Client      | PWA register provider + update banner/toast           |
| Interface | Manifest    | Existing `src/app/manifest.ts` (install metadata)     |

---

## Requirements

### Requirement: Production Service Worker Registration

The system SHALL generate and register a service worker for **production** builds on supporting browsers via **Serwist** (`@serwist/next` or equivalent maintained Next integration). Registration SHALL require a **secure context** (`https:` or localhost/`127.0.0.1`) and SHALL be **disabled by default** during `next dev` unless an explicit opt-in env flag is set (e.g. `NEXT_PUBLIC_PWA_DEV=1`). The worker SHALL precache build-revisioned shell assets needed to boot the UI offline after at least one online visit. Content-Security-Policy headers SHALL allow the worker (`worker-src 'self'` or equivalent).

**Constraint**: MUST  
**Verification**: `pnpm build` emits SW artifacts; Chromium Application → Service Workers shows an active worker after `pnpm start` on localhost; unit/config test or smoke doc asserts `dev` default = off; CSP includes worker allowance

#### Scenario: Production registers SW

- **GIVEN** a production build served with `pnpm start` (or deployed production host) over a secure context
- **WHEN** a supporting browser loads the app online
- **THEN** a service worker is registered and reaches an activated/controlling state for the origin

#### Scenario: Dev does not register by default

- **GIVEN** `next dev` without the PWA opt-in flag
- **WHEN** the app loads
- **THEN** the client does not register a service worker (or registration is explicitly no-op)

#### Scenario: Insecure context skips registration

- **GIVEN** a non-secure context (not HTTPS and not localhost)
- **WHEN** the client registration helper runs
- **THEN** no service worker is registered

### Requirement: Safe Runtime Caching Policy

The service worker SHALL apply the following request policies:

- Precache: build assets / icons / offline fallback document as configured by Serwist
- `/_next/static/**`: cache-first (immutable hashed assets)
- Same-origin **document** navigations: **NetworkOnly** with navigateFallback `/offline.html` — MUST NOT use Workbox `NetworkFirst` for documents; MUST NOT read/write app-route HTML/RSC into Cache Storage as a successful offline page load
- `/api/**` (including `/api/auth/**`): **network-only** — MUST NOT be satisfied from Cache Storage as a Phase 1 feature
- Non-static `/_next/**` (RSC/flight/data): **network-only**
- Cross-origin: do not claim / do not cache as part of Phase 1 defaults

**navigateFallback denylist** SHALL include `/api/**` and `/_next/**` paths that must not be rewritten to `/offline.html` as HTML navigations.

**Precache** SHALL be limited to generated static assets, icons, and `/offline.html` — MUST NOT precache arbitrary authenticated App Router HTML (`/today`, `/dashboard`, etc.).

The service worker MUST NOT persist session tokens or auth API bodies into Cache Storage; cookies remain browser-managed.

**Constraint**: MUST  
**Verification**: Exported runtimeCaching/denylist/precache-allowlist config unit tests; smoke checklist

#### Scenario: API bypasses SW cache

- **GIVEN** an activated Phase 1 service worker
- **WHEN** the client requests any same-origin `/api/**` URL while offline
- **THEN** the response is not served from Cache Storage as a successful cached API payload (request fails or network-only behavior applies)

#### Scenario: RSC flight bypasses SW cache

- **GIVEN** an activated Phase 1 service worker
- **WHEN** the client requests a non-static `/_next/**` RSC/flight URL while offline
- **THEN** the response is not served from Cache Storage as a successful cached payload

#### Scenario: Stale document not served offline

- **GIVEN** an activated Phase 1 service worker and a prior online visit to an authenticated app route (e.g. `/today`)
- **WHEN** the browser is offline and the user navigates to that same app route
- **THEN** the user receives the `/offline.html` fallback (or network failure handling) and MUST NOT be shown a cached HTML/RSC document for that route as a successful page load

#### Scenario: navigateFallback denylist excludes API and RSC paths

- **GIVEN** an activated Phase 1 service worker with navigateFallback `/offline.html`
- **WHEN** the client requests `/api/**` or non-static `/_next/**` while offline
- **THEN** those requests are not rewritten/satisfied as the `/offline.html` HTML document

#### Scenario: Session auth responses not persisted in Cache Storage

- **GIVEN** an activated Phase 1 service worker
- **WHEN** Auth.js / `/api/auth/**` responses are observed by the worker
- **THEN** session tokens and auth response bodies are not stored in Cache Storage

#### Scenario: Static chunks cache-first

- **GIVEN** `/_next/static/**` assets were fetched while online under an active SW
- **WHEN** the same hashed URLs are requested again
- **THEN** they MAY be served from cache without requiring network

### Requirement: Waiting Worker Update Prompt

When a new service worker is installed and enters the **waiting** state, the UI SHALL show a non-blocking affordance (toast or banner; prefer existing Sonner) with copy inviting the user to reload/update (i18n keys under `pwa.*`). Before reload during an active study flow, copy MUST warn that in-progress answers may be lost (`pwa.updateReloadWarning`). Activating the affordance SHALL complete the Serwist/Workbox skipWaiting + clients.claim flow and reload the page. The affordance MAY appear during Learn/study; the system MUST NOT auto-reload without user confirmation. The register/update client provider SHALL mount **inside** `LocaleProvider`.

**Constraint**: MUST  
**Verification**: Component or integration test for prompt visibility and warning copy; manual smoke after a second production deploy/build

#### Scenario: Update prompt when waiting

- **GIVEN** an older controlling worker and a newer worker in `waiting`
- **WHEN** the client detects `registration.waiting`
- **THEN** an update/reload affordance is visible to the user

#### Scenario: No silent mid-study reload

- **GIVEN** a waiting worker and the user is in an active Learn (or other study) flow
- **WHEN** the new worker becomes available
- **THEN** the page does not reload until the user confirms the update action (prompt may still be shown)

#### Scenario: Update confirm warns active study

- **GIVEN** a waiting worker and the user is in an active Learn (or other study) flow
- **WHEN** the update affordance is shown
- **THEN** the copy includes a warning that reloading may lose in-progress study progress

#### Scenario: CSP allows service worker registration

- **GIVEN** production security headers from `next.config.ts`
- **WHEN** CSP is inspected
- **THEN** headers include `worker-src 'self'` (or documented equivalent) so the Serwist worker is not CSP-blocked

### Requirement: Manifest Remains SSOT

Install metadata SHALL continue to be served from `src/app/manifest.ts` / `/manifest.webmanifest`. Phase 1 MUST NOT introduce a second conflicting `public/manifest.json`. Optional field tweaks (`scope`, `id`, icons) MAY be applied only if install audits require them and remain consistent with `seo-metadata-config`.

**Constraint**: MUST  
**Verification**: `pnpm build` lists manifest route; no duplicate static manifest file added

#### Scenario: Single manifest source

- **GIVEN** Phase 1 PWA changes are applied
- **WHEN** `/manifest.webmanifest` is requested
- **THEN** JSON is produced by the Next manifest route (not a divergent hand-copied public file)

---

## Out of Scope

- Offline study / IndexedDB card stores / Background Sync
- Caching authenticated API JSON for offline replay
- Push notifications
- Guaranteeing Chromium-style install prompts on iOS Safari
