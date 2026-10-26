import type { PrismaClient } from "~/generated/client";
import { serializableTransaction } from "~/server/api/transactions";

/** Reads, snapshot replacement, and resets share one serializable transaction. */
export function refreshWeeklyDiscovery(db: PrismaClient) {
  return serializableTransaction(db, async (tx) => {
    const topTabs = await tx.weeklyTabView.findMany({
      orderBy: [{ pageViews: "desc" }, { tabId: "desc" }],
      take: 5,
      select: { tabId: true },
    });
    const tabIds = topTabs.map(({ tabId }) => tabId);
    const fillerTabs = await tx.tab.findMany({
      where: { id: { notIn: tabIds } },
      orderBy: [{ pageViews: "desc" }, { id: "desc" }],
      take: 5 - tabIds.length,
      select: { id: true },
    });
    tabIds.push(...fillerTabs.map(({ id }) => id));

    const topUsers = await tx.weeklyUserTotalTabView.findMany({
      orderBy: [{ totalTabPageViews: "desc" }, { userId: "desc" }],
      take: 5,
      select: { userId: true },
    });
    const userIds = topUsers.map(({ userId }) => userId);
    const fillerUsers = await tx.user.findMany({
      where: { userId: { notIn: userIds } },
      orderBy: [{ totalTabViews: "desc" }, { id: "desc" }],
      take: 5 - userIds.length,
      select: { userId: true },
    });
    userIds.push(...fillerUsers.map(({ userId }) => userId));

    // Replacing rows also works when a deleted tab left gaps in snapshot IDs.
    await tx.mostPopularTabs.deleteMany({});
    await tx.mostPopularTabs.createMany({
      data: tabIds.map((tabId) => ({ tabId })),
    });
    await tx.weeklyFeaturedUser.deleteMany({});
    await tx.weeklyFeaturedUser.createMany({
      data: userIds.map((userId) => ({ userId })),
    });
    await tx.weeklyUserTotalTabView.deleteMany({});
    await tx.weeklyTabView.deleteMany({});
  });
}
