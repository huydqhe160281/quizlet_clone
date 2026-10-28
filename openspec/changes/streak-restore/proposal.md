# Proposal: Streak restore

## Why

Missing one to three days wipes a long streak, which discourages learners from coming back.
A limited number of restores lets them repair a short gap when they return.

## What

- Each user holds streak restores: 5 to start (new and existing accounts), topped up to 3 at
  the start of every month (in `preferredTimezone`) when below 3, and +1 for every 400 study
  answers (the same "reviews" counted by the activity heatmap). The balance never exceeds 5.
- When a user returns after missing 1–3 days, the app offers to restore the streak at a cost of
  1 restore per missed day. Restoring keeps the old streak (missed days do not add to it); if the
  user already studied today, today counts on top of the restored streak.
- `GET/POST /api/v1/user/streak/restore` and a prompt dialog in the app shell; the balance and
  progress toward the next restore are shown in Settings → Study.

## Non-goals

- Restoring gaps longer than 3 days, buying restores, pre-arming "streak freezes".

## Impact

Additive migration on `user_stats` (5 columns, defaults only; existing rows start with 5).
