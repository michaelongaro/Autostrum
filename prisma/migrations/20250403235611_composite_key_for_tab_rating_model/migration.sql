/*
  Warnings:

  - The primary key for the `TabRating` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `TabRating` table. All the data in the column will be lost.
  - Made the column `userId` on table `TabRating` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "TabRating" DROP CONSTRAINT "TabRating_pkey",
DROP COLUMN "id",
ALTER COLUMN "userId" SET NOT NULL,
ADD CONSTRAINT "TabRating_pkey" PRIMARY KEY ("userId", "tabId");
