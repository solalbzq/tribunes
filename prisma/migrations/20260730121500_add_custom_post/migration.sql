-- AlterTable
ALTER TABLE "GeneratedPost" ADD COLUMN     "customPostId" TEXT;

-- CreateTable
CREATE TABLE "CustomPost" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "keyInformation" JSONB NOT NULL,
    "callToAction" TEXT,
    "targetAudience" TEXT,
    "tone" TEXT,
    "desiredPlatforms" JSONB NOT NULL,
    "suggestedCategory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomPost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CustomPost" ADD CONSTRAINT "CustomPost_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPost" ADD CONSTRAINT "GeneratedPost_customPostId_fkey" FOREIGN KEY ("customPostId") REFERENCES "CustomPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
