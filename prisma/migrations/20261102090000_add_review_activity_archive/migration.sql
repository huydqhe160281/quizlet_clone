-- CreateTable
CREATE TABLE "review_activity_archive" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "review_activity_archive_pkey" PRIMARY KEY ("userId","day")
);

-- AddForeignKey
ALTER TABLE "review_activity_archive" ADD CONSTRAINT "review_activity_archive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- "user_stats"."dailyGoalCards" (removed Today page) is no longer in schema.prisma but is kept
-- here: the deployed client still selects it. Drop it in a later migration once this
-- release is live everywhere.

-- Keep review activity when the rows it is counted from are deleted (a set, a card, a
-- study session, or a merge that deletes its sources): every path, cascades included,
-- rolls the deleted rows into "review_activity_archive" per user and UTC day, inside the
-- deleting statement itself. Rows of a user who is being deleted are skipped (the
-- INNER JOIN on "users" finds nothing), so the archive's FK never fails.
-- Not declarable in schema.prisma; `scripts/review-archive-guard.test.ts` fails if a later
-- migration drops these triggers.

CREATE FUNCTION archive_deleted_review_history() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "review_activity_archive" ("userId", "day", "count")
  SELECT d."userId", d."reviewedAt"::date, COUNT(*)::int
  FROM deleted_rows d
  INNER JOIN "users" u ON u.id = d."userId"
  GROUP BY 1, 2
  ON CONFLICT ("userId", "day")
  DO UPDATE SET "count" = "review_activity_archive"."count" + EXCLUDED."count";
  RETURN NULL;
END;
$$;

CREATE TRIGGER review_history_archive_on_delete
AFTER DELETE ON "review_history"
REFERENCING OLD TABLE AS deleted_rows
FOR EACH STATEMENT EXECUTE FUNCTION archive_deleted_review_history();

-- Answers deleted on their own (card delete): their session still exists and names the user.
-- Answers deleted with their session find no session here; the session trigger below
-- counted them before it went.
CREATE FUNCTION archive_deleted_session_cards() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "review_activity_archive" ("userId", "day", "count")
  SELECT ss."userId", d."answeredAt"::date, COUNT(*)::int
  FROM deleted_rows d
  INNER JOIN "study_sessions" ss ON ss.id = d."sessionId"
  INNER JOIN "users" u ON u.id = ss."userId"
  WHERE d."answeredAt" IS NOT NULL
  GROUP BY 1, 2
  ON CONFLICT ("userId", "day")
  DO UPDATE SET "count" = "review_activity_archive"."count" + EXCLUDED."count";
  RETURN NULL;
END;
$$;

CREATE TRIGGER session_cards_archive_on_delete
AFTER DELETE ON "session_cards"
REFERENCING OLD TABLE AS deleted_rows
FOR EACH STATEMENT EXECUTE FUNCTION archive_deleted_session_cards();

CREATE FUNCTION archive_deleted_study_session() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "review_activity_archive" ("userId", "day", "count")
  SELECT OLD."userId", sc."answeredAt"::date, COUNT(*)::int
  FROM "session_cards" sc
  INNER JOIN "users" u ON u.id = OLD."userId"
  WHERE sc."sessionId" = OLD.id AND sc."answeredAt" IS NOT NULL
  GROUP BY 1, 2
  ON CONFLICT ("userId", "day")
  DO UPDATE SET "count" = "review_activity_archive"."count" + EXCLUDED."count";
  RETURN OLD;
END;
$$;

CREATE TRIGGER study_sessions_archive_on_delete
BEFORE DELETE ON "study_sessions"
FOR EACH ROW EXECUTE FUNCTION archive_deleted_study_session();
