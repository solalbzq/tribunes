-- CreateTable
CREATE TABLE "ClubPersonalizationOverride" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "voiceOverride" TEXT,
    "customInstructions" TEXT,
    "signaturePhrase" TEXT,
    "visualConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubPersonalizationOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubPersonalizationHistory" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubPersonalizationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubPersonalizationOverride_clubId_postType_key" ON "ClubPersonalizationOverride"("clubId", "postType");

-- CreateIndex
CREATE INDEX "ClubPersonalizationOverride_clubId_idx" ON "ClubPersonalizationOverride"("clubId");

-- CreateIndex
CREATE INDEX "ClubPersonalizationHistory_clubId_createdAt_idx" ON "ClubPersonalizationHistory"("clubId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClubPersonalizationOverride" ADD CONSTRAINT "ClubPersonalizationOverride_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubPersonalizationHistory" ADD CONSTRAINT "ClubPersonalizationHistory_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
