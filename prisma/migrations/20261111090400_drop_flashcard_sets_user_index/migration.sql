-- One statement per migration: CONCURRENTLY cannot run inside a transaction block, and
-- a single-statement script is sent on its own, so writes are not blocked while the index
-- builds. If this fails midway Postgres keeps an INVALID index: drop it, then
-- `prisma migrate resolve --rolled-back <this migration>` and deploy again.
-- Covered by the (userId, createdAt) prefix.
DROP INDEX CONCURRENTLY IF EXISTS "flashcard_sets_userId_idx";
