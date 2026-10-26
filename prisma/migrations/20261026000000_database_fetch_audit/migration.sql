-- Only ephemeral tracking rows without a parent are removed.
-- Keep the repair, constraints, and indexes atomic.
BEGIN;
DELETE FROM "DailyTabView" d WHERE NOT EXISTS (SELECT 1 FROM "Tab" t WHERE t.id = d."tabId");
DELETE FROM "WeeklyUserTotalTabView" w WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u."userId" = w."userId");
DELETE FROM "WeeklyFeaturedUser" w WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u."userId" = w."userId");

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_tabId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_replyToId_fkey";

-- CreateIndex
CREATE INDEX "WeeklyUserTotalTabView_totalTabPageViews_userId_idx" ON "WeeklyUserTotalTabView"("totalTabPageViews", "userId");

-- CreateIndex
CREATE INDEX "DailyTabView_tabId_idx" ON "DailyTabView"("tabId");

-- CreateIndex
CREATE INDEX "WeeklyTabView_pageViews_tabId_idx" ON "WeeklyTabView"("pageViews", "tabId");

-- CreateIndex
CREATE INDEX "MostPopularTabs_tabId_idx" ON "MostPopularTabs"("tabId");

-- CreateIndex
CREATE INDEX "MostPopularArtists_artistId_idx" ON "MostPopularArtists"("artistId");

-- CreateIndex
CREATE INDEX "Artist_totalViews_id_idx" ON "Artist"("totalViews", "id");

-- CreateIndex
CREATE INDEX "TabRating_tabId_idx" ON "TabRating"("tabId");

-- CreateIndex
CREATE INDEX "Bookmark_bookmarkedByUserId_createdAt_tabId_idx" ON "Bookmark"("bookmarkedByUserId", "createdAt", "tabId");

-- CreateIndex
CREATE INDEX "Bookmark_tabId_idx" ON "Bookmark"("tabId");

-- CreateIndex
CREATE INDEX "Bookmark_tabCreatorUserId_idx" ON "Bookmark"("tabCreatorUserId");

-- CreateIndex
CREATE INDEX "Tab_createdAt_id_idx" ON "Tab"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Tab_pageViews_id_idx" ON "Tab"("pageViews", "id");

-- CreateIndex
CREATE INDEX "Tab_createdByUserId_createdAt_id_idx" ON "Tab"("createdByUserId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Tab_artistId_createdAt_id_idx" ON "Tab"("artistId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Tab_genre_createdAt_id_idx" ON "Tab"("genre", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Comment_tabId_createdAt_id_idx" ON "Comment"("tabId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Comment_replyToId_idx" ON "Comment"("replyToId");

-- CreateIndex
CREATE INDEX "User_totalTabViews_id_idx" ON "User"("totalTabViews", "id");

-- AddForeignKey
ALTER TABLE "WeeklyFeaturedUser" ADD CONSTRAINT "WeeklyFeaturedUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyUserTotalTabView" ADD CONSTRAINT "WeeklyUserTotalTabView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTabView" ADD CONSTRAINT "DailyTabView_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Engagement-only writes need no full-text reindexing.
DROP TRIGGER tab_search_vector_update ON "Tab";
CREATE TRIGGER tab_search_vector_update
BEFORE INSERT OR UPDATE OF title, description, "artistId" ON "Tab"
FOR EACH ROW EXECUTE FUNCTION update_tab_search_vector();

ALTER TABLE "TabRating" ADD CONSTRAINT "TabRating_value_check" CHECK (value BETWEEN 1 AND 5);
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_difficulty_check" CHECK (difficulty BETWEEN 1 AND 5);

-- Repair denormalized values from authoritative rows without changing document versions.
UPDATE "Bookmark" b SET "tabCreatorUserId" = t."createdByUserId"
FROM "Tab" t WHERE t.id = b."tabId" AND b."tabCreatorUserId" IS DISTINCT FROM t."createdByUserId";
UPDATE "Tab" t SET
  "ratingsCount" = (SELECT count(*)::int FROM "TabRating" r WHERE r."tabId" = t.id),
  "averageRating" = (SELECT coalesce(avg(r.value), 0)::float8 FROM "TabRating" r WHERE r."tabId" = t.id);
UPDATE "User" u SET
  "totalTabs" = (SELECT count(*)::int FROM "Tab" t WHERE t."createdByUserId" = u."userId"),
  "totalTabViews" = (SELECT coalesce(sum(t."pageViews"), 0)::int FROM "Tab" t WHERE t."createdByUserId" = u."userId"),
  "totalTabRatings" = (SELECT count(*)::int FROM "TabRating" r JOIN "Tab" t ON t.id = r."tabId" WHERE t."createdByUserId" = u."userId"),
  "averageTabRating" = (SELECT coalesce(avg(r.value), 0)::float8 FROM "TabRating" r JOIN "Tab" t ON t.id = r."tabId" WHERE t."createdByUserId" = u."userId"),
  "totalBookmarksReceived" = (SELECT count(*)::int FROM "Bookmark" b JOIN "Tab" t ON t.id = b."tabId" WHERE t."createdByUserId" = u."userId");
UPDATE "Artist" a SET
  "totalTabs" = (SELECT count(*)::int FROM "Tab" t WHERE t."artistId" = a.id),
  "totalViews" = (SELECT coalesce(sum(t."pageViews"), 0)::int FROM "Tab" t WHERE t."artistId" = a.id);
COMMIT;
