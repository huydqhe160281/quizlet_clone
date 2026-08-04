# QA Smoke: Offline PWA Shell (Phase 1)

Manual checklist after `pnpm build && pnpm start` (HTTPS or `http://localhost`).

## Prerequisites

- [ ] Chromium (or Chrome) DevTools available
- [ ] Build completed successfully; `public/sw.js` exists after build
- [ ] Secure context (`localhost` counts)

## Chromium Application panel

1. Open `http://localhost:3000`, log in if needed, visit `/today` once online.
2. DevTools → **Application** → **Service Workers**: confirm `/sw.js` is registered and activated.
3. **Cache Storage**: confirm entries for static/`offline` only — **no** `/api/**` JSON and **no** cached `/today` HTML shells.
4. **Manifest**: installability metadata from `/manifest.webmanifest` (from `src/app/manifest.ts`, not a second `public/manifest.json`).

## Offline navigation

1. With SW active, DevTools → Network → check **Offline**.
2. Navigate to `/today` (or hard reload a deep link).
3. Expect product **offline shell** (`/offline.html` via SW fallback; localized by `app-locale` cookie), **not** a stale authenticated `/today` shell.
4. Click **Try again** / reload CTA when back online.

## Cold first visit offline

1. Unregister SW + clear site data.
2. Go offline **before** first load.
3. Accept browser default failure — shell cannot install without a prior online visit (documented via `pwa.offlinePrerequisite`).

## Update affordance

1. Deploy or rebuild so `sw.js` / precache revision changes while a tab stays open.
2. Expect non-blocking toast: update available + **study may lose answers** warning.
3. Confirm reload only after explicit action (no silent mid-study reload).

## iOS / Safari

1. Document A2HS: Share → **Add to Home Screen** (`pwa.installIosHint`).
2. Do not expect Chromium-parity install prompt or identical SW offline behavior.

## CSP / HTTPS

1. Confirm response CSP includes `worker-src 'self'`.
2. Non-secure remote HTTP must not register the SW.

## Pass criteria

- [ ] SW registers in production start
- [ ] Offline nav → `/offline.html`, not cached app HTML
- [ ] API/RSC not served from Cache Storage
- [ ] Update toast warns before reload
- [ ] vi/en/ja offline copy renders via LocaleProvider
