-- Query-path indexes found in the performance review. No data changes.

-- session_cards: per-card answer updates filter on (sessionId, cardId); deleting a
-- card cascades by cardId, which previously scanned the whole table.
CREATE INDEX "session_cards_sessionId_cardId_idx" ON "session_cards"("sessionId", "cardId");
CREATE INDEX "session_cards_cardId_idx" ON "session_cards"("cardId");
-- Covered by the (sessionId, cardId) prefix.
DROP INDEX "session_cards_sessionId_idx";

-- flashcard_sets: "my sets" filters on userId and sorts newest first.
CREATE INDEX "flashcard_sets_userId_createdAt_idx" ON "flashcard_sets"("userId", "createdAt" DESC);
-- Covered by the (userId, createdAt) prefix.
DROP INDEX "flashcard_sets_userId_idx";

-- folder_sets: deleting a set cascades by setId; the PK leads with folderId.
CREATE INDEX "folder_sets_setId_idx" ON "folder_sets"("setId");
