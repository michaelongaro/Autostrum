-- migration.sql for add_artist_fts

-- 1. Add the tsvector column
ALTER TABLE "Artist" ADD COLUMN "artistSearchVector" tsvector;

-- 2. Create a function to update the artist tsvector column
CREATE OR REPLACE FUNCTION update_artist_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- Convert the name to tsvector using 'english' config
  -- Use coalesce to handle potential null or empty names gracefully
  NEW."artistSearchVector" := to_tsvector('english', coalesce(NEW.name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a trigger that calls the function before insert or update on Artist
-- Trigger on INSERT or when the 'name' column is updated
CREATE TRIGGER artist_search_vector_update
BEFORE INSERT OR UPDATE OF name ON "Artist"
FOR EACH ROW EXECUTE FUNCTION update_artist_search_vector();

-- 4. Create the GIN index
CREATE INDEX "Artist_artistSearchVector_idx" ON "Artist" USING GIN ("artistSearchVector");

-- 5. Backfill the tsvector for existing Artist data
-- Run this after creating the function and trigger
UPDATE "Artist"
SET "artistSearchVector" = to_tsvector('english', coalesce(name, ''));

