ALTER TABLE "Application"
  ADD COLUMN "applicationNote" TEXT,
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "boothPreference" TEXT,
  ADD COLUMN "attachmentsJson" JSONB,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedByUserId" TEXT;
