-- CreateTable
CREATE TABLE "SlaNotification" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "step" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recipientHash" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SlaNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlaNotification_requestId_revision_step_level_key"
ON "SlaNotification"("requestId", "revision", "step", "level");

-- CreateIndex
CREATE INDEX "SlaNotification_status_createdAt_idx"
ON "SlaNotification"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "SlaNotification"
ADD CONSTRAINT "SlaNotification_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "Request"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
