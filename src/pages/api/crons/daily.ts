import { PrismaClient } from "@prisma/client";

export default async function handler() {
  const prisma = new PrismaClient();

  // clear the daily tab view model
  await prisma.dailyTabView.deleteMany({});

  // get the top 5 most popular tabs
  const topFiveTabs = await prisma.tab.findMany({
    orderBy: {
      pageViews: "desc",
    },
    take: 5,
  });

  // set the most popular tabs
  await prisma.mostPopularTabs.createMany({
    data: topFiveTabs.map((tab) => ({
      tabId: tab.id,
    })),
  });

  // get the top 5 most popular artists
  const topFiveArtists = await prisma.artist.findMany({
    orderBy: {
      totalViews: "desc",
    },
    take: 5,
  });

  // set the most popular artists
  await prisma.mostPopularArtists.createMany({
    data: topFiveArtists.map((artist) => ({
      artistId: artist.id,
    })),
  });
}
