# Tasks: Study Reminder Push

- [x] Prisma `PushSubscription` model + additive migration
- [x] `web-push` dependency, VAPID env vars (`.env.example`, README)
- [x] `push.service.ts`: subscribe / unsubscribe / daily reminder selection + send
- [x] `/api/v1/user/push-subscription` route (GET/POST/DELETE)
- [x] `/api/cron/study-reminder` + `vercel.json` cron `0 13 * * *`
- [x] Service worker `push` + `notificationclick`
- [x] Settings → Study reminder toggle (vi/en/ja copy)
- [ ] Manual QA: Android Chrome, desktop Chrome, iOS 16.4+ home-screen app
