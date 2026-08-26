ALTER TABLE "Validation"
  ADD COLUMN "authorizationMode" TEXT NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN "delegationId" TEXT,
  ADD COLUMN "delegatorId" TEXT,
  ADD COLUMN "delegatorName" TEXT,
  ADD COLUMN "delegatorEmail" TEXT,
  ADD COLUMN "delegationScope" TEXT;

ALTER TABLE "SignatureAuditLog"
  ADD COLUMN "authorizationMode" TEXT NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN "delegationId" TEXT,
  ADD COLUMN "delegatorId" TEXT,
  ADD COLUMN "delegatorName" TEXT,
  ADD COLUMN "delegatorEmail" TEXT,
  ADD COLUMN "delegationScope" TEXT;
