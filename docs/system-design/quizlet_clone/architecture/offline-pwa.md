# Offline PWA Shell (Phase 1)

## Summary

Production builds register a Serwist service worker that precaches static shell assets and the `/offline.html` document. Document navigations use **NetworkOnly** with `/offline.html` as the failure fallback. `/api/**` and non-static `/_next/**` never enter Cache Storage.

## Architecture

```text
Browser
  ├─ App Router UI (PwaProvider inside LocaleProvider)
  ├─ /manifest.webmanifest  ← src/app/manifest.ts (SSOT)
  └─ Service Worker (Serwist → public/sw.js)
        ├─ Precache: build assets + /offline.html (+ icons via public glob)
        ├─ Runtime: /_next/static → CacheFirst
        ├─ Navigations: NetworkOnly → fallback /offline.html
        └─ /api/** + non-static /_next/**: NetworkOnly
```

## Key files

| Path                               | Role                                             |
| ---------------------------------- | ------------------------------------------------ |
| `src/features/pwa/sw-policy.ts`    | Caching policy SSOT (testable)                   |
| `src/app/sw.ts`                    | Serwist worker entry                             |
| `public/offline.html`              | SW navigateFallback (cookie/localStorage locale) |
| `src/app/offline/page.tsx`         | Optional online `/offline` App Router page       |
| `src/features/pwa/PwaProvider.tsx` | Register + update toast                          |
| `next.config.ts`                   | `withSerwist` + CSP `worker-src 'self'`          |
| `messages/{vi,en,ja}/pwa.json`     | Offline / update copy                            |

## Non-goals

- Offline study / IndexedDB card stores / Background Sync → see [offline-study-sync](./offline-study-sync.md)
- Push notifications
- Caching authenticated API JSON
