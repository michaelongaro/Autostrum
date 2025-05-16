-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "Bookmark_tabCreatorUserId_fkey";

-- DropForeignKey
ALTER TABLE "Tab" DROP CONSTRAINT "Tab_artistId_fkey";

-- DropForeignKey
ALTER TABLE "Tab" DROP CONSTRAINT "Tab_createdByUserId_fkey";

-- AlterTable
ALTER TABLE "Bookmark" ALTER COLUMN "tabCreatorUserId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_tabCreatorUserId_fkey" FOREIGN KEY ("tabCreatorUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
