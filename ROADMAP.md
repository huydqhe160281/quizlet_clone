# Roadmap

## Completed

- **2026-10-24 — paper-ink-theme**: Fourth visual theme "Paper & Ink" in light (`paper`) and dark (`paper-dark`): editorial notebook look (cream paper with faint rules, navy ink outlines, sticky-yellow offset shadows, Be Vietnam Pro). Theme plumbing centralised: registry `src/lib/theme/themes.ts` drives next-themes, ThemeToggle, ThemePicker (3×2, token-based swatches), Sonner and Tailwind `dark:`; per-theme CSS in `src/styles/themes/`; neutral `data-slot` hooks (`flashcard-face`, `accent-surface`, `answer-option`, `well`, `progress-track`, `tile`) replace the pastel-named classes; decorations switch via trait tokens (`page-backdrop`, `decor-backdrop`, `decor-glow`, `decor-orbs`). Test-mode correct option also shows a check icon. Spec updated (`ui-design-system`).

- **2026-10-23 — pastel-theme + mobile study focus mode**: Third theme "Pastel" (Soft UI / neumorphism + claymorphism, scoped `.pastel` tokens and `data-slot` hooks on shadcn primitives, decorative clay orbs on landing/auth). Phones hide MobileNav and the guide chat FAB on study screens (`isStudySessionPath`). Mobile polish: compact email-verification banner, My Sets action grid, keyboard tip hidden on touch. Specs updated (`ui-design-system`, `ui-components`, `ai-assistant-chat-box`).

- **2026-07-21 — optimize-perf-ux-ui-structure** (brainstorm): Layered Performance → UX → UI → Structure playbook; study session resume/idempotency; dashboard due priority + activity coalesce; search/library polish (auth own+public, infinite Load more, shared preview cache); soft radius token ladder. Archived to `openspec/changes/archive/2026-07-21-optimize-perf-ux-ui-structure/`. Specs synced to main (`optimize-perf-playbook`, `dashboard-search-library`, `study-modes`, `ui-design-system`).

- **2026-07-28 — adaptive-learning-coach** (Phase 1): Today planner at `/today` — daily card goal, ranked due/weak/new queue, retention insights, recommended spaced or LEARN session; dashboard due alert → `/today`. Archived: `openspec/changes/archive/2026-07-28-adaptive-learning-coach/`. Specs synced to main (`daily-learning-queue`, `daily-study-goals`, `retention-insights`, `recommended-study-session`, `today-learning-page`, `dashboard-search-library`).

- **2026-07-29 — adaptive-learning-coach-phase-2**: Preferred IANA timezone for goal/insights day windows; Today LEARN `cardIds` subset on `createSession` + streak UI refresh. Archived: `openspec/changes/archive/2026-07-29-adaptive-learning-coach-phase-2/`. Specs synced (`daily-study-goals`, `retention-insights`, `recommended-study-session`, `study-modes`, `today-learning-page`).

- **2026-08-04 — offline-study-sync** (Phase 2): IndexedDB study cache (LRU 5) + durable mutation queue + idempotent replay; sync status UX. Archived: `openspec/changes/archive/2026-08-04-offline-study-sync/`. Specs synced (`offline-study-cache`, `offline-mutation-queue`, `offline-sync-replay`).

- **2026-08-04 — offline-pwa** (Phase 1): Serwist SW + `/offline.html` shell; NetworkOnly documents; no API cache; update toast. Archived: `openspec/changes/archive/2026-08-04-offline-pwa/`. Specs synced (`pwa-service-worker`, `offline-fallback-ux`, `seo-metadata-config`). Deferred follow-up: `offline-study-sync`.

## In progress

- [x] **i18n-multilingual-vi-en-ja**: VI/EN/JA UI + system copy; cookie/DB preference; LanguageSwitcher; study content unchanged. (implementation done — verify/checkpoint remaining)

Cập nhật lần cuối: 2026-10-23
