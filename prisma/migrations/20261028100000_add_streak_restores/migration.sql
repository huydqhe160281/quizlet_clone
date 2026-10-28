-- AlterTable
ALTER TABLE "user_stats" ADD COLUMN     "brokenStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "brokenStreakLastDate" TIMESTAMP(3),
ADD COLUMN     "streakRestoreCredited" INTEGER,
ADD COLUMN     "streakRestores" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "streakRestoresMonth" TEXT;

