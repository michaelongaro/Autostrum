import { PrismaClient } from "@prisma/client";
import { env } from "~/env";

export async function GET(request: Request) {
  // make sure that the request is from Vercel's cron job
  const authHeader = request.headers.get("authorization");
  if (authHeader !== env.CRON_SECRET) {
    console.warn("Unauthorized cron attempt or missing authHeader.");
    console.log(
      "Expected authHeader:",
      env.CRON_SECRET,
      "Received authHeader:",
      authHeader,
    );
    return new Response("Unauthorized", {
      status: 401,
    });
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

  return Response.json({ success: true });
}
