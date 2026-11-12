-- One statement per migration: CONCURRENTLY cannot run inside a transaction block, and
-- a single-statement script is sent on its own, so writes are not blocked while the index
-- builds. If this fails midway Postgres keeps an INVALID index: drop it, then
-- `prisma migrate resolve --rolled-back <this migration>` and deploy again.
-- Deleting a set cascades by setId; the folder_sets PK leads with folderId.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "folder_sets_setId_idx" ON "folder_sets"("setId");
