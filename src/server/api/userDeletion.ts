import type { PrismaClient } from "~/generated/client";
import { serializableTransaction } from "~/server/api/transactions";
import {
  refreshArtistStatistics,
  refreshTabRatings,
  refreshUserStatistics,
} from "~/server/api/statistics";

/** Capture affected rows before FK cascades remove the user's interactions. */
export function deleteUserData(
  db: PrismaClient,
  userId: string,
  preserveTabs: boolean,
) {
  return serializableTransaction(db, async (tx) => {
    const ownedTabs = await tx.tab.findMany({
      where: { createdByUserId: userId },
      select: { id: true, title: true, artistId: true },
    });
    const ratings = await tx.tabRating.findMany({
      where: { userId },
      select: { tabId: true, tab: { select: { createdByUserId: true } } },
    });
    const bookmarks = await tx.bookmark.findMany({
      where: { bookmarkedByUserId: userId },
      select: { tab: { select: { createdByUserId: true } } },
    });
    const affectedUsers = [...ratings, ...bookmarks]
      .map(({ tab }) => tab.createdByUserId)
      .filter((id): id is string => id !== null && id !== userId);

    if (!preserveTabs) {
      await tx.user.updateMany({
        where: { pinnedTabId: { in: ownedTabs.map(({ id }) => id) } },
        data: { pinnedTabId: null },
      });
      await tx.tab.deleteMany({ where: { createdByUserId: userId } });
    }
    // SetNull preserves authorship-free tabs; cascades remove private drafts,
    // outgoing bookmarks/ratings, featured slots, and weekly user counters.
    await tx.user.deleteMany({ where: { userId } });
    await refreshTabRatings(
      tx,
      ratings.map(({ tabId }) => tabId),
    );
    await refreshUserStatistics(tx, affectedUsers);
    if (!preserveTabs) {
      await refreshArtistStatistics(
        tx,
        ownedTabs
          .map(({ artistId }) => artistId)
          .filter((id): id is number => id !== null),
      );
    }
    return ownedTabs;
  });
}
