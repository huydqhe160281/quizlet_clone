# Roadmap

## Completed

- **2026-07-21 — optimize-perf-ux-ui-structure** (brainstorm): Layered Performance → UX → UI → Structure playbook; study session resume/idempotency; dashboard due priority + activity coalesce; search/library polish (auth own+public, infinite Load more, shared preview cache); soft radius token ladder. Archived to `openspec/changes/archive/2026-07-21-optimize-perf-ux-ui-structure/`. Specs synced to main (`optimize-perf-playbook`, `dashboard-search-library`, `study-modes`, `ui-design-system`).

- **2026-07-28 — adaptive-learning-coach** (Phase 1): Today planner at `/today` — daily card goal, ranked due/weak/new queue, retention insights, recommended spaced or LEARN session; dashboard due alert → `/today`. Archived: `openspec/changes/archive/2026-07-28-adaptive-learning-coach/`. Specs synced to main (`daily-learning-queue`, `daily-study-goals`, `retention-insights`, `recommended-study-session`, `today-learning-page`, `dashboard-search-library`).

- **2026-07-29 — adaptive-learning-coach-phase-2**: Preferred IANA timezone for goal/insights day windows; Today LEARN `cardIds` subset on `createSession` + streak UI refresh. Archived: `openspec/changes/archive/2026-07-29-adaptive-learning-coach-phase-2/`. Specs synced (`daily-study-goals`, `retention-insights`, `recommended-study-session`, `study-modes`, `today-learning-page`).

- **2026-08-04 — offline-study-sync** (Phase 2): IndexedDB study cache (LRU 5) + durable mutation queue + idempotent replay; sync status UX. Archived: `openspec/changes/archive/2026-08-04-offline-study-sync/`. Specs synced (`offline-study-cache`, `offline-mutation-queue`, `offline-sync-replay`).

- **2026-08-04 — offline-pwa** (Phase 1): Serwist SW + `/offline.html` shell; NetworkOnly documents; no API cache; update toast. Archived: `openspec/changes/archive/2026-08-04-offline-pwa/`. Specs synced (`pwa-service-worker`, `offline-fallback-ux`, `seo-metadata-config`). Deferred follow-up: `offline-study-sync`.

## In progress

- [x] **i18n-multilingual-vi-en-ja**: VI/EN/JA UI + system copy; cookie/DB preference; LanguageSwitcher; study content unchanged. (implementation done — verify/checkpoint remaining)

Cập nhật lần cuối: 2026-08-04
