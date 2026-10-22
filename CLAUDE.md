# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Flashcard app (Quizlet clone): Next.js 15 App Router + React 19, TypeScript, Prisma/PostgreSQL (Supabase), NextAuth v5 (beta), TanStack Query, Zustand, Tailwind + shadcn/ui (Radix), Serwist PWA. Package manager is **pnpm**; Node must be `^20.19` or `>=22.12` (Vitest 4's rolldown native binding is skipped on older Node and tests fail to start). Deployed on Vercel: `vercel.json` runs `scripts/vercel-migrate.mjs` before `next build`, which applies `prisma migrate deploy` only for `VERCEL_ENV=production` (Preview needs `MIGRATE_ON_PREVIEW=1`). CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests with coverage thresholds (`test:coverage`) and `generate:guide:check`. A daily Vercel Cron (`vercel.json` → `/api/cron/cleanup`, needs `CRON_SECRET`) purges expired rate-limit buckets, idempotency records and verification tokens.

## Commands

```bash
pnpm dev                      # dev server — must be port 3000 (NextAuth cookies are configured for it)
pnpm build                    # runs generate:guide, then next build
pnpm lint                     # next lint (ESLint flat config: eslint.config.mjs)
pnpm typecheck                # tsc --noEmit
pnpm test                     # vitest run (unit/integration)
pnpm vitest run src/features/study/lib/sm2.test.ts   # single test file
pnpm vitest run -t "test name"                       # filter by test name
pnpm test:coverage            # enforces per-file thresholds (see vitest.config.ts)
CI=1 pnpm test:e2e            # Playwright; build first — it serves `pnpm start` on port 3002
pnpm db:migrate               # prisma migrate dev (uses DIRECT_DATABASE_URL, port 5432)
pnpm db:generate              # prisma generate (also runs on postinstall)
pnpm generate:guide           # regenerate src/generated/guide-config.json (committed)
pnpm generate:guide:check     # fails if the committed guide config is stale
```

Pre-commit hook runs `lint-staged` (eslint --fix + prettier). `prisma migrate dev` generates `DROP INDEX` for the raw-SQL search indexes `sets_search_idx` / `sets_title_prefix_idx` (they can't be declared in `schema.prisma`); delete those lines from the generated migration — `scripts/search-index-guard.test.ts` fails if a migration leaves them dropped. `DATABASE_URL` is the pooled PgBouncer URL (port 6543); `DIRECT_DATABASE_URL` is for migrations.

## Architecture

### Layering

- `src/app/` — App Router. Route groups: `(app)` protected pages, `(auth)` login/register/reset, `(public)` library + shared set preview. REST API lives under `src/app/api/v1/**/route.ts`.
- `src/server/` — server-only code. `services/` holds business logic (sets, study, learning, search, ai, user); `auth/` is NextAuth config; `ai/` wraps LLM providers; `db.ts` is the Prisma singleton.
- `src/features/<domain>/` — client-side feature modules: `components/`, `hooks/`, `schemas/` (Zod), `api/` (fetch clients), `query-keys.ts`, `lib/` (pure logic).
- `src/lib/` — cross-cutting helpers (i18n, rate limiting, http, navigation, seo). `src/components/ui/` is shadcn/ui.

### API route pattern

Route handlers are thin: wrap in `withErrorHandler` (`src/lib/api-error.ts`), call `requireUserId()` / `optionalUserId()` (`src/server/auth/auth-utils.ts`), parse input with the Zod schemas from `src/features/*/schemas`, then delegate to a `src/server/services/*` function. Throw `ApiError(code, message, status)` for expected failures; `ZodError` becomes a 400 `VALIDATION_ERROR` automatically. Mutating routes call `assertApiRateLimit(req)` (DB-backed rate-limit buckets); AI routes use `ai-rate-limit-guard`.

Session revocation: JWTs carry `User.sessionVersion` (`src/server/auth/session-version.ts`); a password reset bumps it, and the Node-side jwt callback in `auth.ts` rejects stale tokens. Middleware uses the edge `auth.config.ts` without that DB check, so the client signs out when `/api/v1/auth/me` returns 401 (`useAccountStatus`). Password-reset and email-verification tokens share `verification_tokens`; verification identifiers are prefixed `verify-email:` and must never be accepted as reset tokens. `src/app/api/v1/auth-contract.test.ts` checks every API handler returns 401 when signed out — list intentionally public handlers there.

Route protection happens in `src/middleware.ts` (a `protectedPrefixes` list), which also resolves the locale. There must be only one middleware file — locale logic is composed inside the NextAuth `auth()` handler.

### Caching

Server reads use `unstable_cache` with tags (e.g. `public-sets`, per-user `sets-<userId>`); mutations must invalidate via `src/server/services/sets/set-cache.ts` / `revalidateTag`. Client side uses TanStack Query with per-feature query-key factories.

### Study system

- Study modes: Flashcard, Learn, Write (fuzzy match, `src/lib/utils/fuzzy.ts`), Test (MC/T-F/typing), Draw (CJK stroke practice via hanzi-writer; only for cards with `type = new-word`). Mode logic lives in `src/features/study/lib/` (`round-engine`, `test-generator`, `sm2`), session client state in `src/features/study/store.ts` (Zustand).
- Spaced repetition is SM-2 (`src/features/study/lib/sm2.ts`), persisted as `CardProgress` + `ReviewHistory` by `src/server/services/study/study.service.ts`.
- "Today" adaptive coach (`/today`): `src/server/services/learning/` builds a ranked due/weak/new queue, daily goals, and retention insights. Day boundaries use the user's preferred IANA timezone (`zoned-day.ts`).

### Offline / PWA

- Serwist service worker (`src/app/sw.ts` → `public/sw.js`) is disabled in `next dev` unless `NEXT_PUBLIC_PWA_DEV=1`. Documents and API are NetworkOnly; `/offline.html` is the fallback. CSP is set in `next.config.ts` and must keep `REQUIRED_WORKER_SRC_CSP` from `src/features/pwa/sw-policy.ts`.
- Offline study sync (`src/features/study-offline/`): IndexedDB cache of recent sessions (LRU 5) + a durable mutation queue replayed on reconnect. Replay is idempotent server-side via client mutation IDs recorded in the `ProcessedMutation` table — keep that contract intact when changing study answer/review endpoints.

### i18n (vi default, en, ja)

Custom thin i18n in `src/lib/i18n/` — no URL locale prefix. Locale resolution: `User.preferredLocale` → `app-locale` cookie → Accept-Language → `vi`. Middleware forwards it as the `x-app-locale` header; server code reads it via `getRequestLocale()` and translates with `t(catalog, key)`; client components use `useTranslations()` from `LocaleProvider`. Catalogs are `messages/{vi,en,ja}/*.json` — add every new key to all three locales. User study content (cards, set titles) is never translated.

### AI features

AI set generation and the floating guide chat use Ollama via the Vercel AI SDK (`src/server/ai/ollama.ts`), falling back to Z.ai (`with-fallback.ts`) after repeated failures. `OLLAMA_BASE_URL` / `OLLAMA_MODEL` are required in production. The guide assistant's site knowledge is `src/generated/guide-config.json`, built from `docs/guide/` (FAQ + flows) by `scripts/generate-guide-config.mjs` — regenerate and commit it after editing those docs.

## Testing conventions

- Vitest defaults to the `node` environment; component tests opt into jsdom with a `/** @vitest-environment jsdom */` header. Use `src/test/render-with-locale.tsx` to render components that need translations.
- Service tests mock Prisma with `vi.hoisted(() => ({ ...model mocks }))` + `vi.mock('@/server/db', ...)` rather than hitting a database. `next/cache` is mocked the same way.
- Coverage thresholds apply only to `sm2.ts`, `fuzzy.ts`, `set.service.ts`, `stats.service.ts`, and `study.service.ts`.
- E2E specs are in `tests/e2e/` (excluded from Vitest); `tests/security/` holds cookie tests.

## Specs and design docs

Feature work follows an OpenSpec workflow: capability specs in `openspec/specs/<capability>/spec.md`, in-flight changes in `openspec/changes/<name>/`, completed ones in `openspec/changes/archive/`. `ROADMAP.md` records completed/in-progress changes. Architecture and ADRs live in `docs/system-design/quizlet_clone/`; manual QA checklists in `docs/qa/`. Check the relevant spec before changing behavior it covers.
