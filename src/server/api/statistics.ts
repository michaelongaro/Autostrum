import { Prisma } from "~/generated/client";

/** Recompute from source rows, including after cascading deletes. */
export async function refreshUserStatistics(
  tx: Prisma.TransactionClient,
  userIds: string[],
) {
  if (userIds.length === 0) return;
  await tx.$executeRaw`
    UPDATE "User" u SET
      "totalTabs" = (SELECT count(*)::int FROM "Tab" t WHERE t."createdByUserId" = u."userId"),
      "totalTabViews" = (SELECT coalesce(sum(t."pageViews"), 0)::int FROM "Tab" t WHERE t."createdByUserId" = u."userId"),
      "totalTabRatings" = (SELECT count(*)::int FROM "TabRating" r JOIN "Tab" t ON t.id = r."tabId" WHERE t."createdByUserId" = u."userId"),
      "averageTabRating" = (SELECT coalesce(avg(r.value), 0)::float8 FROM "TabRating" r JOIN "Tab" t ON t.id = r."tabId" WHERE t."createdByUserId" = u."userId"),
      "totalBookmarksReceived" = (SELECT count(*)::int FROM "Bookmark" b JOIN "Tab" t ON t.id = b."tabId" WHERE t."createdByUserId" = u."userId")
    WHERE u."userId" IN (${Prisma.join([...new Set(userIds)])})
  `;
}

export async function refreshTabRatings(
  tx: Prisma.TransactionClient,
  tabIds: number[],
) {
  if (tabIds.length === 0) return;
  // Ratings and page views must not change the published document's version.
  await tx.$executeRaw`
    UPDATE "Tab" t SET
      "ratingsCount" = (SELECT count(*)::int FROM "TabRating" r WHERE r."tabId" = t.id),
      "averageRating" = (SELECT coalesce(avg(r.value), 0)::float8 FROM "TabRating" r WHERE r."tabId" = t.id)
    WHERE t.id IN (${Prisma.join([...new Set(tabIds)])})
  `;
}

export async function refreshArtistStatistics(
  tx: Prisma.TransactionClient,
  artistIds: number[],
) {
  if (artistIds.length === 0) return;
  await tx.$executeRaw`
    UPDATE "Artist" a SET
      "totalTabs" = (SELECT count(*)::int FROM "Tab" t WHERE t."artistId" = a.id),
      "totalViews" = (SELECT coalesce(sum(t."pageViews"), 0)::int FROM "Tab" t WHERE t."artistId" = a.id)
    WHERE a.id IN (${Prisma.join([...new Set(artistIds)])})
  `;
}
