-- One statement per migration: CONCURRENTLY cannot run inside a transaction block, and
-- a single-statement script is sent on its own, so writes are not blocked while the index
-- builds. If this fails midway Postgres keeps an INVALID index: drop it, then
-- `prisma migrate resolve --rolled-back <this migration>` and deploy again.
-- "My sets" filters on userId and sorts newest first.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "flashcard_sets_userId_createdAt_idx" ON "flashcard_sets"("userId", "createdAt" DESC);
