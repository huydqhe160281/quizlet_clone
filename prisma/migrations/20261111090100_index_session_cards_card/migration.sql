-- One statement per migration: CONCURRENTLY cannot run inside a transaction block, and
-- a single-statement script is sent on its own, so writes are not blocked while the index
-- builds. If this fails midway Postgres keeps an INVALID index: drop it, then
-- `prisma migrate resolve --rolled-back <this migration>` and deploy again.
-- Deleting a card cascades by cardId, which previously scanned the whole table.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "session_cards_cardId_idx" ON "session_cards"("cardId");
