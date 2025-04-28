BEGIN;




--------------------------------------------
-- 1. Rename WeeklyFeaturedArtist → WeeklyFeaturedUser
--------------------------------------------
ALTER INDEX "WeeklyFeaturedArtist_pkey" RENAME TO "WeeklyFeaturedUser_pkey";
ALTER TABLE "WeeklyFeaturedArtist" RENAME TO "WeeklyFeaturedUser";
ALTER TABLE "WeeklyFeaturedUser" RENAME COLUMN "artistId" TO "userId";




--------------------------------------------
-- 2. Transform the old Artist table into the new User table
--    (the old Artist table’s columns match those needed for User)
--    (the old Artist table’s primary key is renamed to User_pkey)
--    (the old Artist table’s unique constraints are renamed to User_uniqueconstraints)
--------------------------------------------
ALTER INDEX "Artist_pkey" RENAME TO "User_pkey";
ALTER INDEX "Artist_userId_key" RENAME TO "User_userId_key";
ALTER INDEX "Artist_username_key" RENAME TO "User_username_key";
ALTER TABLE "Artist" RENAME TO "User";




--------------------------------------------
-- 3. Create the new Artist table (now separate from User)
--------------------------------------------
CREATE TABLE "Artist" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  "isVerified" BOOLEAN NOT NULL DEFAULT false
);




--------------------------------------------
-- 4. Update the Tab table
--------------------------------------------




-- (a) Drop the old foreign key constraint on "createdById" (if its name isn’t exactly this, adjust accordingly)
ALTER TABLE "Tab" DROP CONSTRAINT IF EXISTS "Tab_createdById_fkey";




-- (b) Add new columns required by the new schema:
ALTER TABLE "Tab"
  ADD COLUMN difficulty INT NOT NULL DEFAULT 1,
  ADD COLUMN "averageRating" FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN "titleAndArtistName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "artistId" INT,  -- new; remains null unless set later
  ADD COLUMN "pageViews" INT NOT NULL DEFAULT 0;


-- (c) Remove the column no longer needed:
ALTER TABLE "Tab" DROP COLUMN IF EXISTS "hasRecordedAudio";




-- (d) Recreate the foreign key on createdById so it now references User(userId)
ALTER TABLE "Tab"
  ADD CONSTRAINT fk_tab_createdBy FOREIGN KEY ("createdById")
      REFERENCES "User"("userId") ON DELETE CASCADE;




-- (e) Add a new foreign key constraint for artistId referencing the new Artist table
ALTER TABLE "Tab"
  ADD CONSTRAINT fk_tab_artist FOREIGN KEY ("artistId")
      REFERENCES "Artist"(id) ON DELETE CASCADE;




--------------------------------------------
-- 5. Create the new Bookmark table (which replaces Like)
--------------------------------------------
CREATE TABLE "Bookmark" (
  id SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "tabId" INT NOT NULL,
  "tabCreatorUserId" TEXT NOT NULL,
  "bookmarkedByUserId" TEXT NOT NULL,
  CONSTRAINT fk_bookmark_tab FOREIGN KEY ("tabId")
      REFERENCES "Tab"(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmark_tabCreator FOREIGN KEY ("tabCreatorUserId")
      REFERENCES "User"("userId") ON DELETE CASCADE,
  CONSTRAINT fk_bookmark_bookmarkedBy FOREIGN KEY ("bookmarkedByUserId")
      REFERENCES "User"("userId") ON DELETE CASCADE
);




--------------------------------------------
-- 6. Create the new TabRating table
--------------------------------------------
CREATE TABLE "TabRating" (
  id SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  value INT NOT NULL,
  "tabId" INT NOT NULL,
  "userId" INT,  -- optional
  CONSTRAINT fk_tabrating_tab FOREIGN KEY ("tabId")
      REFERENCES "Tab"(id) ON DELETE CASCADE,
  CONSTRAINT fk_tabrating_user FOREIGN KEY ("userId")
      REFERENCES "User"(id) ON DELETE CASCADE
);




--------------------------------------------
-- 7. Update Comment table: add updatedAt column
--------------------------------------------
ALTER TABLE "Comment"
  ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now();




--------------------------------------------
-- 8. Migrate data from the old Like table into Bookmark
--------------------------------------------
INSERT INTO "Bookmark" ("tabId", "tabCreatorUserId", "bookmarkedByUserId", "createdAt")
  SELECT "tabId", "tabArtistId", "artistWhoLikedId", now()
  FROM "Like";




-- Now drop the old Like table (its extra column, tabArtistUsername, is dropped along with it)
DROP TABLE "Like";




COMMIT;
