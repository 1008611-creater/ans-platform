-- CreateTable
CREATE TABLE "invite_email_deliveries" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_email_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invite_email_deliveries_codeId_email_createdAt_idx" ON "invite_email_deliveries"("codeId", "email", "createdAt");

-- CreateIndex
CREATE INDEX "invite_email_deliveries_actorId_idx" ON "invite_email_deliveries"("actorId");

-- AddForeignKey
ALTER TABLE "invite_email_deliveries" ADD CONSTRAINT "invite_email_deliveries_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "invite_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_email_deliveries" ADD CONSTRAINT "invite_email_deliveries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
