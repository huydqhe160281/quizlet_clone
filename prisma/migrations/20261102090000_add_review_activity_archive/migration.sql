-- CreateTable
CREATE TABLE "review_activity_archive" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "review_activity_archive_pkey" PRIMARY KEY ("userId","day")
);

-- AddForeignKey
ALTER TABLE "review_activity_archive" ADD CONSTRAINT "review_activity_archive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
