-- DropForeignKey
ALTER TABLE "TabRating" DROP CONSTRAINT "TabRating_userId_fkey";

-- AlterTable
ALTER TABLE "Tab" ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "description" DROP DEFAULT,
ALTER COLUMN "key" DROP NOT NULL,
ALTER COLUMN "key" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TabRating" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "TabRating" ADD CONSTRAINT "TabRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
