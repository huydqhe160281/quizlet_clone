# Flashcard App (Quizlet Clone)

Personal flashcard app with spaced repetition, four study modes, public library, and dashboard stats.

**Stack:** Next.js 15 · TypeScript · Prisma · PostgreSQL (Supabase) · NextAuth v5 · Vercel · Serwist PWA shell (production)

Installable web app shell: production builds register a service worker with an `/offline.html` fallback. Phase 2 offline study sync caches recent session cards in IndexedDB and queues answers/reviews for replay (API still NetworkOnly). See `docs/qa/offline-pwa-smoke-test.md` and `docs/qa/offline-study-sync-smoke-test.md`.

## Quick Start

```bash
pnpm install
cp .env.example .env
# Fill DATABASE_URL, DIRECT_DATABASE_URL, NEXTAUTH_SECRET, Supabase keys
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable                                    | Description                                                        |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                              | Pooled Postgres URL (port **6543**, PgBouncer)                     |
| `DIRECT_DATABASE_URL`                       | Direct Postgres URL (port **5432**, migrations)                    |
| `NEXTAUTH_SECRET`                           | JWT signing secret                                                 |
| `NEXTAUTH_URL`                              | App URL                                                            |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional)                                            |
| `SUPABASE_URL` / keys                       | Media upload via presigned URLs                                    |
| `SUPABASE_MEDIA_BUCKET`                     | Storage bucket name (default: `flashcard-media`)                   |
| `RESEND_API_KEY`                            | Password reset emails (optional in dev)                            |
| `OLLAMA_BASE_URL`                           | Ollama API URL (required in production)                            |
| `OLLAMA_MODEL`                              | Ollama model name (required in production)                         |
| `OLLAMA_MODEL_LARGE`                        | Optional larger model for high-card requests                       |
| `ZAI_API_KEY`                               | Z.ai API key (fallback if Ollama fails)                            |
| `ZAI_MODEL`                                 | Z.ai model name (default: `glm-5.2`)                               |
| `NEXT_PUBLIC_PWA_DEV`                       | Set to `1` to enable Serwist SW during `next dev` (off by default) |

### AI Set Generation (Ollama)

For the **Generate with AI** feature, configure Ollama:

```bash
# Local development (defaults apply if unset)
OLLAMA_BASE_URL=http://localhost:11434/api
OLLAMA_MODEL=llama3
# Optional fallback when requesting >50 cards
# OLLAMA_MODEL_LARGE=gpt-oss:120b

# Ollama Cloud example:
# OLLAMA_BASE_URL=https://ollama.com/api
# OLLAMA_MODEL=gpt-oss:20b
# OLLAMA_MODEL_LARGE=gpt-oss:120b
# OLLAMA_API_KEY=your-key

# Z.ai fallback (kicked in after Ollama fails 2× per tier)
# ZAI_API_KEY=your-key-from-z.ai/manage-apikey/apikey-list
# ZAI_MODEL=glm-5.2    # default when not set
```

In **production**, both variables are required. Point `OLLAMA_BASE_URL` at your Ollama Cloud or self-hosted endpoint reachable from Vercel.

### AI Guide Assistant (Chat Box)

The floating guide chat uses the same Ollama configuration. Site knowledge is generated at build time:

```bash
npm run generate:guide        # Regenerate src/generated/guide-config.json
npm run generate:guide:check  # CI: fail if committed config is stale
```

Hand-authored flows/FAQ live under `docs/guide/`. See [docs/guide/README.md](docs/guide/README.md).

## Internationalization (VI / EN / JA)

UI and system copy default to **Vietnamese**. Locale is stored in the `app-locale` cookie (and `User.preferredLocale` when signed in). There is no `/vi|/en|/ja` URL prefix.

- Catalogs: `messages/{vi,en,ja}/*.json`
- Core helpers: `src/lib/i18n/`
- Switcher: navbar language control (cookie + optional preference API)

After pulling schema changes, run `pnpm db:migrate` so the nullable `preferredLocale` column exists.

## Scripts

| Command           | Description                                    |
| ----------------- | ---------------------------------------------- |
| `pnpm dev`        | Dev server                                     |
| `pnpm build`      | Production build (runs `generate:guide` first) |
| `pnpm test`       | Unit/integration tests (Vitest)                |
| `pnpm typecheck`  | TypeScript (`tsc --noEmit`)                    |
| `pnpm test:e2e`   | Playwright E2E tests                           |
| `pnpm db:migrate` | Prisma migrations                              |
| `pnpm db:studio`  | Prisma Studio                                  |

## Features

- **Auth** — Email/password, Google OAuth, password reset
- **Sets & cards** — CRUD, folders, tags, media upload, drag-and-drop reorder
- **Study modes** — Flashcard, Learn, Write (fuzzy match), Test (MC/T-F/Typing), Draw (CJK stroke practice via hanzi-writer; requires cards marked `type = new-word`)
- **SM-2** — Spaced repetition queue at `/study` (nav entry temporarily hidden; study from each set)
- **Today (Adaptive Learning Coach)** — Daily goal, prioritized due/weak/new queue, retention insights, and one recommended study CTA at `/today`
- **Dashboard** — Streak, accuracy, activity heatmap, recent sessions; due-cards alert deep-links to `/today`
- **Search & library** — Public sets at `/library`, preview at `/shared/[setId]`

## Deploy to Vercel

1. Import GitHub repo in Vercel (uses `vercel.json` — runs `prisma migrate deploy` before build)
2. Set all env vars from `.env.example` (use port **6543** + `?pgbouncer=true` for `DATABASE_URL`)
3. Set `NEXTAUTH_URL` / `AUTH_URL` to your production domain (e.g. `https://your-app.vercel.app`)
4. **Supabase Storage**: In Supabase Dashboard → Storage → create a **public** bucket named `flashcard-media` (or match `SUPABASE_MEDIA_BUCKET`). Allow image/audio MIME types.
5. **Resend** (optional prod): Set `RESEND_API_KEY` for forgot-password emails
6. Deploy

### Quality gates

```bash
pnpm typecheck         # TypeScript
pnpm test              # unit tests
pnpm test:coverage     # 80% threshold on sm2, fuzzy, services
pnpm build             # production build
CI=1 pnpm test:e2e     # Playwright (build first)
```

## Recent Updates (V2)

### 1. Set & Card Import Wizard

Users can import flashcards from JSON or CSV files or copy-paste text in the Import wizard (`/sets/import`).

- **CSV Format**: Enforces a comma-separated format. The first row can optionally be headers like `front,back,example` (headers are skipped if they match). Empty/blank rows are automatically filtered.
- **JSON Format**: Enforces an array of card objects:
  ```json
  [{ "front": "question", "back": "answer", "example": "optional sample sentence" }]
  ```
- **Constraints**: Maximum of 2000 cards per set, and maximum file size of 2MB.

### 2. Password Reset & Resend Setup

- In **Production**: Requires `RESEND_API_KEY` to send emails.
- In **Development**: If `RESEND_API_KEY` is missing or empty, the forgot-password API responds with a copyable `devResetUrl` link directly in the JSON response, which the UI renders so developers can copy and test the reset flow immediately without setting up Resend.

### 3. Remember Me & Cookie Duration

During login, check the **Remember me** checkbox to extend the session longevity:

- **Default**: Cookie expires in **24 hours**.
- **Remember me checked**: Cookie persists for **30 days**.

### 4. Development Port

Ensure you run the development server on port **3000** (`pnpm dev` uses `-p 3000` by default). NextAuth session cookies are configured for port `3000` to prevent localhost cookie mismatch issues.
