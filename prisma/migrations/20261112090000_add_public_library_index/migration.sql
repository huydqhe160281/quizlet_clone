-- The public library ("newest") filters visibility = PUBLIC and pages by
-- (createdAt DESC, id DESC); this index serves that keyset scan without a sort.
CREATE INDEX "flashcard_sets_visibility_createdAt_id_idx" ON "flashcard_sets"("visibility", "createdAt" DESC, "id" DESC);
-- Covered by the (visibility, createdAt, id) prefix.
DROP INDEX "flashcard_sets_visibility_idx";
