# Flashcard App (Quizlet Clone)

Personal flashcard app with spaced repetition, four study modes, public library, and dashboard stats.

**Stack:** Next.js 15 · TypeScript · Prisma · PostgreSQL (Supabase) · NextAuth v5 · Vercel

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

| Variable                                    | Description                                      |
| ------------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                              | Pooled Postgres URL (port **6543**, PgBouncer)   |
| `DIRECT_DATABASE_URL`                       | Direct Postgres URL (port **5432**, migrations)  |
| `NEXTAUTH_SECRET`                           | JWT signing secret                               |
| `NEXTAUTH_URL`                              | App URL                                          |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional)                          |
| `SUPABASE_URL` / keys                       | Media upload via presigned URLs                  |
| `SUPABASE_MEDIA_BUCKET`                     | Storage bucket name (default: `flashcard-media`) |
| `RESEND_API_KEY`                            | Password reset emails (optional in dev)          |
| `OLLAMA_BASE_URL`                           | Ollama API URL (required in production)          |
| `OLLAMA_MODEL`                              | Ollama model name (required in production)       |
| `OLLAMA_MODEL_LARGE`                        | Optional larger model for high-card requests     |

### AI Set Generation (Ollama)

For the **Generate with AI** feature, configure Ollama:

```bash
# Local development (defaults apply if unset)
OLLAMA_BASE_URL=http://localhost:11434/api
OLLAMA_MODEL=llama3
# Optional fallback when requesting >50 cards
# OLLAMA_MODEL_LARGE=gemma3:27b

# Ollama Cloud example:
# OLLAMA_BASE_URL=https://ollama.com/api
# OLLAMA_MODEL=gemma3:12b
# OLLAMA_MODEL_LARGE=gpt-oss:120b
# OLLAMA_API_KEY=your-key
```

In **production**, both variables are required. Point `OLLAMA_BASE_URL` at your Ollama Cloud or self-hosted endpoint reachable from Vercel.

## Scripts

| Command           | Description                     |
| ----------------- | ------------------------------- |
| `pnpm dev`        | Dev server                      |
| `pnpm build`      | Production build                |
| `pnpm test`       | Unit/integration tests (Vitest) |
| `pnpm test:e2e`   | Playwright E2E tests            |
| `pnpm db:migrate` | Prisma migrations               |
| `pnpm db:studio`  | Prisma Studio                   |

## Features

- **Auth** — Email/password, Google OAuth, password reset
- **Sets & cards** — CRUD, folders, tags, media upload, drag-and-drop reorder
- **Study modes** — Flashcard, Learn, Write (fuzzy match), Test (MC/T-F/Typing), Draw (CJK stroke practice via hanzi-writer; requires cards marked `type = new-word`)
- **SM-2** — Spaced repetition queue at `/study`
- **Dashboard** — Streak, accuracy, activity heatmap, recent sessions
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
- **Constraints**: Maximum of 500 cards per set, and maximum file size of 2MB.

### 2. Password Reset & Resend Setup

- In **Production**: Requires `RESEND_API_KEY` to send emails.
- In **Development**: If `RESEND_API_KEY` is missing or empty, the forgot-password API responds with a copyable `devResetUrl` link directly in the JSON response, which the UI renders so developers can copy and test the reset flow immediately without setting up Resend.

### 3. Remember Me & Cookie Duration

During login, check the **Remember me** checkbox to extend the session longevity:

- **Default**: Cookie expires in **24 hours**.
- **Remember me checked**: Cookie persists for **30 days**.

### 4. Development Port

Ensure you run the development server on port **3000** (`pnpm dev` uses `-p 3000` by default). NextAuth session cookies are configured for port `3000` to prevent localhost cookie mismatch issues.
