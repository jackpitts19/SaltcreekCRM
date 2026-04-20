-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "enrichedAt" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'other';
