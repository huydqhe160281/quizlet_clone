---
name: study-reminder-push
description: Opt-in daily Web Push reminder for users who have not studied today.
version: 1.0.0
---

# Study Reminder Push Specifications

## ADDED Requirements

### Requirement: Device Subscription

An authenticated user SHALL be able to register and remove a Web Push subscription for the
current device via `/api/v1/user/push-subscription` (`GET` public key, `POST` subscribe,
`DELETE` unsubscribe). Subscriptions are keyed by endpoint; re-subscribing the same endpoint
under another account moves it to that account. Mutations are same-origin and rate limited.
**Constraint**: MUST
**Verification**: `push-subscription/route.test.ts`, `push.service.test.ts`

#### Scenario: Subscribe this device

- **GIVEN** a signed-in user whose browser granted notification permission
- **WHEN** the client POSTs `{ endpoint, keys: { p256dh, auth } }`
- **THEN** a `push_subscriptions` row exists for that endpoint and user

#### Scenario: Push not configured

- **GIVEN** `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` are unset
- **WHEN** the client GETs the public key
- **THEN** it receives `publicKey: null` and the Settings toggle explains reminders are unavailable

### Requirement: Daily Reminder Cron

`GET /api/cron/study-reminder` SHALL require `Authorization: Bearer <CRON_SECRET>` and run once
per day (Vercel Cron, `0 13 * * *`). For each subscribed user it SHALL send one reminder only when
the user has not studied on the current calendar day in `preferredTimezone` and the local hour is
between 08:00 and 21:59. Copy uses the user's `preferredLocale` (default `vi`); when the effective
streak is above 0 the copy mentions keeping the streak. Subscriptions answered with HTTP 404/410
SHALL be deleted.
**Constraint**: MUST
**Verification**: `study-reminder/route.test.ts`, `push.service.test.ts`

#### Scenario: Already studied today

- **GIVEN** a subscribed user whose `lastStudiedDate` equals today in their timezone
- **WHEN** the cron runs
- **THEN** no push is sent to that user

#### Scenario: Streak at risk

- **GIVEN** a subscribed user with a 3-day streak who studied yesterday but not today
- **WHEN** the cron runs at 20:00 local time
- **THEN** each of their devices receives a reminder mentioning the 3-day streak

#### Scenario: Expired subscription

- **GIVEN** the push service answers 410 for an endpoint
- **WHEN** the cron sends to it
- **THEN** that subscription row is deleted and the run continues

### Requirement: Notification Display

The service worker SHALL show the pushed `{ title, body, url }` as a notification (tag
`study-reminder`, so a newer reminder replaces an older one) and, on click, focus an open app
window or open `url` (default `/today`).
**Constraint**: MUST
**Verification**: Manual QA on Android Chrome and an iOS home-screen install
