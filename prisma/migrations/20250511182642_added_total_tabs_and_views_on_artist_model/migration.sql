-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "totalTabs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalViews" INTEGER NOT NULL DEFAULT 0;
