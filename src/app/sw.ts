/**
 * Serwist service worker — NetworkOnly documents + /offline.html fallback.
 * Do NOT import `@serwist/next/worker` defaultCache (it NetworkFirsts HTML/API).
 */
/// <reference types="@serwist/next/typings" />
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from 'serwist';
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from 'serwist';
import { OFFLINE_FALLBACK_PATH, isNavigateFallbackDenied } from '@/features/pwa/sw-policy';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url }) => url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'next-static',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 128,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        }),
      ],
    }),
  },
  {
    matcher: ({ url }) => url.pathname.startsWith('/api/'),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url }) =>
      url.pathname.startsWith('/_next/') && !url.pathname.startsWith('/_next/static/'),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ request }) => request.mode === 'navigate' || request.destination === 'document',
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: OFFLINE_FALLBACK_PATH,
        matcher({ request }) {
          if (request.destination !== 'document' && request.mode !== 'navigate') {
            return false;
          }
          const pathname = new URL(request.url).pathname;
          return !isNavigateFallbackDenied(pathname);
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Daily study reminder (see /api/cron/study-reminder). Payload: { title, body, url }.
type ReminderPayload = { title?: string; body?: string; url?: string };

self.addEventListener('push', (event) => {
  let payload: ReminderPayload = {};
  try {
    payload = (event.data?.json() as ReminderPayload | undefined) ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'QuizFree', {
      body: payload.body,
      // No `badge`: Android masks it to a silhouette, so the full-colour icon became a white square.
      icon: '/icon.png',
      tag: 'study-reminder',
      data: { url: payload.url || '/today' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data as { url?: string } | null)?.url || '/today',
    self.location.origin
  );
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === target.origin);
      if (open) {
        await open.focus();
        if ('navigate' in open) await open.navigate(target.href).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(target.href);
    })()
  );
});
