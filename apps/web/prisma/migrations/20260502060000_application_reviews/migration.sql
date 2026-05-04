CREATE TABLE "ApplicationReview" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApplicationReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicationReview_applicationId_createdAt_idx"
ON "ApplicationReview"("applicationId", "createdAt");

ALTER TABLE "ApplicationReview"
ADD CONSTRAINT "ApplicationReview_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
