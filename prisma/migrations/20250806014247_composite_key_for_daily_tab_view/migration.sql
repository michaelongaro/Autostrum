/*
  Warnings:

  - The primary key for the `DailyTabView` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "DailyTabView" DROP CONSTRAINT "DailyTabView_pkey",
ADD CONSTRAINT "DailyTabView_pkey" PRIMARY KEY ("userIpAddress", "tabId");
