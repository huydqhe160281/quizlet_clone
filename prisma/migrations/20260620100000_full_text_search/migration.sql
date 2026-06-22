-- Full-text search: search_vector column, trigger, GIN index
ALTER TABLE "flashcard_sets" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

CREATE OR REPLACE FUNCTION update_set_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_search_vector_trigger ON "flashcard_sets";
CREATE TRIGGER set_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description
  ON "flashcard_sets"
  FOR EACH ROW EXECUTE FUNCTION update_set_search_vector();

UPDATE "flashcard_sets"
SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(CAST(description AS text), '')), 'B');

CREATE INDEX IF NOT EXISTS sets_search_idx ON "flashcard_sets" USING GIN("search_vector");
