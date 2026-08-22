-- Enable trigram similarity for typo-tolerant / partial-word search (no app-level library).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Speed up ILIKE '%…%' and word_similarity / %> matches on titles and artist names.
CREATE INDEX IF NOT EXISTS "Tab_title_trgm_idx" ON "Tab" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Artist_name_trgm_idx" ON "Artist" USING GIN (name gin_trgm_ops);
