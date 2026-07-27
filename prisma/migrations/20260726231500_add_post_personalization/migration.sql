-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "bannedWords" TEXT,
ADD COLUMN     "customInstructions" TEXT,
ADD COLUMN     "postVisualConfigs" JSONB,
ADD COLUMN     "signaturePhrase" TEXT;
