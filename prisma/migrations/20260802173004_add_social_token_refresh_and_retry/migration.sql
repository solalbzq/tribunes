-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "metaUserAccessToken" TEXT,
ADD COLUMN     "metaUserTokenExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GeneratedPost" ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "publishResults" JSONB,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SocialConnection" ADD COLUMN     "invalid" BOOLEAN NOT NULL DEFAULT false;

