-- AlterTable
ALTER TABLE "GeneratedPost" ADD COLUMN     "seasonRecapId" TEXT;

-- CreateTable
CREATE TABLE "SeasonRecap" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "wins" INTEGER NOT NULL,
    "draws" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "rankingNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonRecap_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SeasonRecap" ADD CONSTRAINT "SeasonRecap_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPost" ADD CONSTRAINT "GeneratedPost_seasonRecapId_fkey" FOREIGN KEY ("seasonRecapId") REFERENCES "SeasonRecap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
