-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('TENNIS', 'PADEL', 'FOOTBALL', 'HANDBALL', 'BASKETBALL', 'VOLLEYBALL', 'OTHER');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('INTERCLUB', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "HomeAway" AS ENUM ('DOMICILE', 'EXTERIEUR');

-- AlterTable
ALTER TABLE "Club"
ADD COLUMN "tennisVisualConfig" JSONB,
ADD COLUMN "tenupUrl" TEXT;

-- AlterTable
ALTER TABLE "GeneratedPost"
ALTER COLUMN "matchId" DROP NOT NULL,
ADD COLUMN "postType" TEXT NOT NULL DEFAULT 'MATCH_RESULT',
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "tournamentScheduleId" TEXT,
ADD COLUMN "weeklyScheduleId" TEXT;

-- AlterTable
ALTER TABLE "MatchResult"
ADD COLUMN "division" TEXT,
ADD COLUMN "extraData" JSONB,
ADD COLUMN "globalScore" TEXT,
ADD COLUMN "homeAway" "HomeAway",
ADD COLUMN "matchType" "MatchType",
ADD COLUMN "round" TEXT,
ADD COLUMN "scoreDetail" JSONB,
ADD COLUMN "sport" TEXT,
ADD COLUMN "teamName" TEXT;

-- CreateTable
CREATE TABLE "SocialConnection" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "igUserId" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenupSchedule" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "matches" JSONB NOT NULL,
    "clubName" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenupSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "model" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "credits" INTEGER,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentSchedule" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "pdfUrl" TEXT,
    "rawText" TEXT NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "tournamentName" TEXT NOT NULL,
    "venue" TEXT NOT NULL DEFAULT '',
    "parsedData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklySchedule" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "matches" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialConnection_clubId_idx" ON "SocialConnection"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_clubId_provider_providerAccountId_key" ON "SocialConnection"("clubId", "provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "TenupSchedule_clubId_weekStart_key" ON "TenupSchedule"("clubId", "weekStart");

-- CreateIndex
CREATE INDEX "UsageEvent_clubId_createdAt_idx" ON "UsageEvent"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_kind_createdAt_idx" ON "UsageEvent"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "SocialConnection" ADD CONSTRAINT "SocialConnection_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenupSchedule" ADD CONSTRAINT "TenupSchedule_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSchedule" ADD CONSTRAINT "TournamentSchedule_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySchedule" ADD CONSTRAINT "WeeklySchedule_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPost" ADD CONSTRAINT "GeneratedPost_tournamentScheduleId_fkey" FOREIGN KEY ("tournamentScheduleId") REFERENCES "TournamentSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPost" ADD CONSTRAINT "GeneratedPost_weeklyScheduleId_fkey" FOREIGN KEY ("weeklyScheduleId") REFERENCES "WeeklySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
