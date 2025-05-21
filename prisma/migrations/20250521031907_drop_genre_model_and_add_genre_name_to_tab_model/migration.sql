-- Step 1: Add the new 'genreName' column to the 'Tab' table.
-- It's typically added as nullable initially to allow data population.
ALTER TABLE "Tab" ADD COLUMN "genreName" TEXT;

-- Step 2: Populate the 'genreName' column with data from the 'Genre' table.
UPDATE "Tab"
SET "genreName" = (SELECT "name" FROM "Genre" WHERE "Genre"."id" = "Tab"."genreId")
WHERE "Tab"."genreId" IS NOT NULL;

-- Step 3: Make the 'genreName' column non-nullable.
ALTER TABLE "Tab" ALTER COLUMN "genreName" SET NOT NULL;

-- Step 4: Drop the foreign key constraint from 'Tab'.'genreId' referencing 'Genre'.'id'.
ALTER TABLE "Tab" DROP CONSTRAINT "Tab_genreId_fkey"; -- Replace "Tab_genreId_fkey" with the actual constraint name if you were writing this from scratch. Prisma will handle this.

-- Step 5: Drop the old 'genreId' column from the 'Tab' table.
ALTER TABLE "Tab" DROP COLUMN "genreId";

-- Step 6: Drop the 'Genre' table as it's no longer needed.
DROP TABLE "Genre";
