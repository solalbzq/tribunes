-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "automationMode" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramLinkCode" TEXT;

-- AlterTable
ALTER TABLE "GeneratedPost" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedReason" TEXT;

-- CreateTable
CREATE TABLE "TelegramMessage" (
    "id" TEXT NOT NULL,
    "generatedPostId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramMessage_generatedPostId_idx" ON "TelegramMessage"("generatedPostId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_telegramLinkCode_key" ON "Club"("telegramLinkCode");

-- CreateIndex
CREATE INDEX "GeneratedPost_status_idx" ON "GeneratedPost"("status");

-- CreateIndex
CREATE INDEX "GeneratedPost_createdAt_idx" ON "GeneratedPost"("createdAt");

-- AddForeignKey
ALTER TABLE "TelegramMessage" ADD CONSTRAINT "TelegramMessage_generatedPostId_fkey" FOREIGN KEY ("generatedPostId") REFERENCES "GeneratedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
