-- CreateTable
CREATE TABLE "ClubBrandAsset" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceNote" TEXT,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "analysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubBrandAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubBrandAsset_clubId_kind_idx" ON "ClubBrandAsset"("clubId", "kind");

-- AddForeignKey
ALTER TABLE "ClubBrandAsset" ADD CONSTRAINT "ClubBrandAsset_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
