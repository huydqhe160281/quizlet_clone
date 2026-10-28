# Proposal: Daily study reminder (Web Push)

## Why

Streaks break silently: nothing reminds a learner who has not studied today. The app is a PWA
with a service worker already, so Web Push can reach Android/desktop browsers and iOS 16.4+
home-screen apps without the app running.

## What

- Opt-in "Daily study reminder" toggle in Settings → Study (per device/browser).
- `push_subscriptions` table storing each device's Web Push subscription.
- One daily Vercel Cron (`/api/cron/study-reminder`, 13:00 UTC ≈ 20:00 Vietnam) that pushes a
  localized reminder to subscribed users who have not studied today in their `preferredTimezone`.
- Service worker `push` / `notificationclick` handlers that show the reminder and open `/today`.

## Non-goals

- User-chosen reminder time (needs an hourly cron; Vercel Hobby allows one run per day).
- Email reminders, marketing/broadcast pushes, reminders for anonymous users.

## Impact

- New migration (additive table only). New env vars `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`; without them the toggle explains reminders are unavailable and the cron no-ops.
- New dependency `web-push`.
