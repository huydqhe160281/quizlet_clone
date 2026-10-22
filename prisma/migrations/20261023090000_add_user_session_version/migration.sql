-- Bumped on password reset; JWTs carrying an older value are rejected (session revocation).
ALTER TABLE "users" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
