-- AlterTable
ALTER TABLE "GeneratedPost" ADD COLUMN     "clubAnnouncementId" TEXT,
ADD COLUMN     "engagementPollId" TEXT,
ADD COLUMN     "matchAnnouncementId" TEXT,
ADD COLUMN     "playerSpotlightId" TEXT;

-- CreateTable
CREATE TABLE "MatchAnnouncement" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "venue" TEXT,
    "competition" TEXT,
    "isHome" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSpotlight" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "achievement" TEXT NOT NULL,
    "periodLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerSpotlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubAnnouncement" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ctaText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementPoll" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementPoll_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MatchAnnouncement" ADD CONSTRAINT "MatchAnnouncement_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSpotlight" ADD CONSTRAINT "PlayerSpotlight_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubAnnouncement" ADD CONSTRAINT "ClubAnnouncement_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementPoll" ADD CONSTRAINT "EngagementPoll_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPost" ADD CONSTRAINT "GeneratedPost_matchAnnouncementId_fkey" FOREIGN KEY ("matchAnnouncementId") REFERENCES "MatchAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPost" ADD CONSTRAINT "GeneratedPost_playerSpotlightId_fkey" FOREIGN KEY ("playerSpotlightId") REFERENCES "PlayerSpotlight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPost" ADD CONSTRAINT "GeneratedPost_clubAnnouncementId_fkey" FOREIGN KEY ("clubAnnouncementId") REFERENCES "ClubAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPost" ADD CONSTRAINT "GeneratedPost_engagementPollId_fkey" FOREIGN KEY ("engagementPollId") REFERENCES "EngagementPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
