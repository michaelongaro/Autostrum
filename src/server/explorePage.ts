export async function getExploreData() {
  const { prisma } = await import("~/server/db");

  // get the five weekly featured users' userIds
  const featuredUserIds = await prisma.weeklyFeaturedUser.findMany({
    orderBy: { id: "asc" },
    select: {
      userId: true,
    },
    take: 5,
  });

  // get the user data for the weekly featured users
  const featuredUsers = await prisma.user.findMany({
    where: {
      userId: {
        in: featuredUserIds.map((user) => user.userId),
      },
    },
  });

  const featuredUserPinnedTabIds = [];

  for (const user of featuredUsers) {
    // if the user has a pinned tab, add it to the array
    if (user.pinnedTabId) {
      featuredUserPinnedTabIds.push(user.pinnedTabId);
    }
  }

  // get each user's pinned tab
  const minimalPinnedTabs = await prisma.tab.findMany({
    where: {
      id: {
        in: featuredUserPinnedTabIds.map((id) => id),
      },
    },
    select: {
      id: true,
      title: true,
      genre: true,
      createdAt: true,
      updatedAt: true,
      difficulty: true,
      averageRating: true,
      ratingsCount: true,
      artist: {
        select: {
          id: true,
          name: true,
          isVerified: true,
        },
      },
      // do not need "createdBy" since we already have the user's full data
    },
  });

  // combine the user data with their pinned tabs
  const orderedUsers = featuredUserIds.flatMap(({ userId }) => {
    const user = featuredUsers.find((candidate) => candidate.userId === userId);
    return user ? [user] : [];
  });
  const weeklyFeaturedUsers = orderedUsers.map((user) => {
    const pinnedTab = minimalPinnedTabs.find(
      (tab) => tab.id === user.pinnedTabId,
    );

    return {
      ...user,
      pinnedTab: pinnedTab || null, // if no pinned tab, set to null
    };
  });

  return { weeklyFeaturedUsers };
}
