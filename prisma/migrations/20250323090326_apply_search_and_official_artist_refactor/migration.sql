-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "fk_bookmark_bookmarkedby";

-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "fk_bookmark_tab";

-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "fk_bookmark_tabcreator";

-- DropForeignKey
ALTER TABLE "Tab" DROP CONSTRAINT "fk_tab_artist";

-- DropForeignKey
ALTER TABLE "Tab" DROP CONSTRAINT "fk_tab_createdby";

-- DropForeignKey
ALTER TABLE "TabRating" DROP CONSTRAINT "fk_tabrating_tab";

-- DropForeignKey
ALTER TABLE "TabRating" DROP CONSTRAINT "fk_tabrating_user";

-- AlterTable
ALTER TABLE "Bookmark" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Comment" ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TabRating" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "TabRating" ADD CONSTRAINT "TabRating_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabRating" ADD CONSTRAINT "TabRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_tabCreatorUserId_fkey" FOREIGN KEY ("tabCreatorUserId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_bookmarkedByUserId_fkey" FOREIGN KEY ("bookmarkedByUserId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
