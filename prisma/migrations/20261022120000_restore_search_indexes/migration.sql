-- Restore the full-text search GIN index. Migration 20260721151304_ dropped it again:
-- the index cannot be declared in schema.prisma (search_vector is Unsupported), so
-- `prisma migrate dev` keeps generating `DROP INDEX "sets_search_idx"`.
-- scripts/search-index-guard.test.ts fails if a later migration drops these indexes.
CREATE INDEX IF NOT EXISTS "sets_search_idx" ON "flashcard_sets" USING GIN ("search_vector");

-- Prefix title match (`lower(title) LIKE 'q%'`) for the OR branch of set search, so
-- the planner can BitmapOr both branches instead of scanning the table.
CREATE INDEX IF NOT EXISTS "sets_title_prefix_idx" ON "flashcard_sets" (lower("title") text_pattern_ops);
