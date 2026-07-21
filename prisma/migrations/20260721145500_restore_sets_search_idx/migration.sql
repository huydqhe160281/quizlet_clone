-- Restore full-text search GIN index after accidental drop.
CREATE INDEX IF NOT EXISTS "sets_search_idx" ON "flashcard_sets" USING GIN("search_vector");
