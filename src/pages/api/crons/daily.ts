import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "~/env";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // make sure that the request is from Vercel's cron job
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    console.warn("Unauthorized cron attempt or missing authHeader.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // make sure that the request is a GET request
  if (req.method !== "GET") {
    console.warn("Invalid request method for cron job.");
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const prisma = new PrismaClient();

  try {
    // clear the daily tab view model
    await prisma.dailyTabView.deleteMany({});

    // get the top 5 most popular tabs
    const topFiveTabs = await prisma.tab.findMany({
      orderBy: {
        pageViews: "desc",
      },
      take: 5,
    });

    // Create an array of individual update promises
    const updateTabPromises = topFiveTabs.map((tab, index) =>
      prisma.mostPopularTabs.update({
        where: { id: index + 1 },
        data: { tabId: tab.id },
      }),
    );

    // get the top 5 most popular artists
    const topFiveArtists = await prisma.artist.findMany({
      orderBy: {
        totalViews: "desc",
      },
      take: 5,
    });

    // Create an array of individual update promises
    const updateArtistPromises = topFiveArtists.map((artist, index) =>
      prisma.mostPopularArtists.update({
        where: { id: index + 1 },
        data: { artistId: artist.id },
      }),
    );

    // Execute all update operations in a single transaction
    await prisma.$transaction([...updateTabPromises, ...updateArtistPromises]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Cron job failed:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    await prisma.$disconnect();
  }
}
