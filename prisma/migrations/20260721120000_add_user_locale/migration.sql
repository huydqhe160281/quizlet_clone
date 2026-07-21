-- AlterEnum
CREATE TYPE "Locale" AS ENUM ('vi', 'en', 'ja');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "preferredLocale" "Locale";
