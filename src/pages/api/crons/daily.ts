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
  await prisma.mostPopularTabs.updateMany({
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
  await prisma.mostPopularArtists.updateMany({
    data: topFiveArtists.map((artist) => ({
      artistId: artist.id,
    })),
  });

  return res.status(200).json({ success: true });
}
