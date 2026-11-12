-- One statement per migration: CONCURRENTLY cannot run inside a transaction block, and
-- a single-statement script is sent on its own, so writes are not blocked while the index
-- builds. If this fails midway Postgres keeps an INVALID index: drop it, then
-- `prisma migrate resolve --rolled-back <this migration>` and deploy again.
-- Public library keyset paging: WHERE visibility ORDER BY createdAt DESC, id DESC.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "flashcard_sets_visibility_createdAt_id_idx" ON "flashcard_sets"("visibility", "createdAt" DESC, "id" DESC);
