-- AlterTable
ALTER TABLE "User" ADD COLUMN     "averageTabRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalBookmarksReceived" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTabViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTabs" INTEGER NOT NULL DEFAULT 0;
