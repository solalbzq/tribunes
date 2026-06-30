-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "suspended" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Club" ADD COLUMN "suspended" BOOLEAN NOT NULL DEFAULT false;
