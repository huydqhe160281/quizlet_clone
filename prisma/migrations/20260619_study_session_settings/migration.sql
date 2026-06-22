-- migration: study_session_settings
-- AddColumn study_sessions.settings (nullable JSONB)
ALTER TABLE "study_sessions" ADD COLUMN "settings" JSONB;
