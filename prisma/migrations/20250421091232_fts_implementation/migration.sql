-- AlterTable
ALTER TABLE "Tab" DROP COLUMN "titleAndArtistName";


-- migration.sql


-- 1. Add the tsvector column to the Tab table
ALTER TABLE "Tab" ADD COLUMN "searchVector" tsvector;


-- 2. Create a function to update the tsvector column
-- This function combines weighted fields from Tab and its related Artist
CREATE OR REPLACE FUNCTION update_tab_search_vector()
RETURNS TRIGGER AS $$
DECLARE
  artist_name_text text := '';
BEGIN
  -- Fetch the artist name if artistId is not null
  IF NEW."artistId" IS NOT NULL THEN
    SELECT name INTO artist_name_text FROM "Artist" WHERE id = NEW."artistId";
  END IF;


  -- Combine fields with weights (A=highest, C=lowest) and coalesce nulls
  -- Use 'english' configuration for stemming and stop words
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(artist_name_text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 3. Create a trigger that calls the function before insert or update on Tab
CREATE TRIGGER tab_search_vector_update
BEFORE INSERT OR UPDATE ON "Tab"
FOR EACH ROW EXECUTE FUNCTION update_tab_search_vector();


-- Optional but recommended: Add a trigger on the Artist table
-- If an artist's name changes, update the vectors of their associated tabs
CREATE OR REPLACE FUNCTION update_artist_tabs_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "Tab"
  SET "searchVector" =
    setweight(to_tsvector('english', coalesce("Tab".title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'B') || -- Use the NEW artist name
    setweight(to_tsvector('english', coalesce("Tab".description, '')), 'C')
  WHERE "Tab"."artistId" = NEW.id;
  RETURN NEW; -- Or OLD for DELETE triggers, though less relevant here
END;
$$ LANGUAGE plpgsql;


-- Trigger for Artist updates
CREATE TRIGGER artist_name_update_trigger
AFTER UPDATE OF name ON "Artist" -- Only trigger if 'name' column is updated
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name) -- Only if the name actually changed
EXECUTE FUNCTION update_artist_tabs_search_vector();


-- Note: Handling artist deletion (setting artistId to NULL on tabs or cascading deletes)
-- might require additional trigger logic or rely on application-level updates if needed.
-- The current Tab trigger handles NULL artistId correctly on Tab updates.


-- 4. Create the GIN index for fast searching
CREATE INDEX "Tab_searchVector_idx" ON "Tab" USING GIN ("searchVector");


-- 5. (Optional but Recommended) Backfill the tsvector for existing data
-- Run this *after* creating the function and trigger, or manually update
-- This might take time on large tables
UPDATE "Tab"
SET "searchVector" =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce((SELECT name FROM "Artist" WHERE id = "Tab"."artistId"), '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C');




