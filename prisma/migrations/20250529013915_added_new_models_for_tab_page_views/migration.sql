/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `WeeklyFeaturedUser` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "WeeklyFeaturedUser" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "WeeklyUserTotalTabView" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "totalTabPageViews" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WeeklyUserTotalTabView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTabView" (
    "userIpAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tabId" INTEGER NOT NULL,

    CONSTRAINT "DailyTabView_pkey" PRIMARY KEY ("userIpAddress")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyUserTotalTabView_userId_key" ON "WeeklyUserTotalTabView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyFeaturedUser_userId_key" ON "WeeklyFeaturedUser"("userId");
