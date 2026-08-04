-- CreateTable
CREATE TABLE "processed_mutations" (
    "id" TEXT NOT NULL,
    "clientMutationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_mutations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "processed_mutations_createdAt_idx" ON "processed_mutations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "processed_mutations_clientMutationId_userId_key" ON "processed_mutations"("clientMutationId", "userId");

-- AddForeignKey
ALTER TABLE "processed_mutations" ADD CONSTRAINT "processed_mutations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
