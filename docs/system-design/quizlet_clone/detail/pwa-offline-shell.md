# Detail Design: Offline PWA Shell

See also: [architecture/offline-pwa.md](../../architecture/offline-pwa.md).

## Caching rules (locked)

| Request class                                      | Strategy                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| Precache (`/_next/static`, icons, `/offline.html`) | Precache                                                             |
| `/_next/static/**`                                 | CacheFirst                                                           |
| Document navigations                               | **NetworkOnly** + fallback `/offline.html` (never NetworkFirst HTML) |
| `/api/**`                                          | NetworkOnly                                                          |
| Non-static `/_next/**`                             | NetworkOnly                                                          |

**navigateFallback denylist:** `/api/**`, `/_next/**`

## Offline shell locale

- SW fallback is static `public/offline.html` (not precached App Router HTML)
- Locale: `app-locale` cookie → `localStorage` → default `vi`
- Catalog SSOT: `messages/*/pwa.json`; `offline-html.test.ts` guards embedded copy parity
- App Router `/offline` may remain for online visits only

## Client registration

- `PwaProvider` inside `LocaleProvider` in `src/app/layout.tsx`
- Register when `NODE_ENV === 'production'` or `NEXT_PUBLIC_PWA_DEV=1`, and secure context
- Waiting worker → Sonner toast with `pwa.updateReloadWarning`; confirm → `messageSkipWaiting` + reload
- No auto-reload; `reloadOnOnline={false}`
- Mount-only registration (do not re-register on every `router.refresh`)

## CSP

Root headers include `worker-src 'self'`.
