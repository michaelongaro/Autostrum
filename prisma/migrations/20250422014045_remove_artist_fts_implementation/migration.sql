/*
  Warnings:

  - You are about to drop the column `artistSearchVector` on the `Artist` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Artist_artistSearchVector_idx";

-- AlterTable
ALTER TABLE "Artist" DROP COLUMN "artistSearchVector";

-- Manually added SQL to clean up Artist FTS specifics:

-- 1. Drop the trigger that updated Artist."artistSearchVector"
DROP TRIGGER IF EXISTS artist_search_vector_update ON "Artist";

-- 2. Drop the function that updated Artist."artistSearchVector"
DROP FUNCTION IF EXISTS update_artist_search_vector();

-- NOTE: We KEEP the update_artist_tabs_search_vector() function
-- and the artist_name_update_trigger trigger because they update
-- the Tab."searchVector" when an Artist.name changes.