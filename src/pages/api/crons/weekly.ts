import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "~/env";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // make sure that the request is from Vercel's cron job
  const { secret } = req.query;
  if (secret !== env.CRON_SECRET) {
    console.warn("Unauthorized cron attempt or missing secret.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // make sure that the request is a GET request
  if (req.method !== "GET") {
    console.warn("Invalid request method for cron job.");
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const prisma = new PrismaClient();

  // get the top 5 most viewed users from the past week
  const topFiveUsers = await prisma.weeklyUserTotalTabView.findMany({
    orderBy: {
      totalTabPageViews: "desc",
    },
    take: 5,
  });

  // clear the previous weekly featured users
  await prisma.weeklyFeaturedUser.deleteMany({});

  // set the new weekly featured users
  await prisma.weeklyFeaturedUser.createMany({
    data: topFiveUsers.map((user) => ({
      userId: user.userId,
    })),
  });

  // clear the previous weekly user total tab views
  await prisma.weeklyUserTotalTabView.deleteMany({});

  // revalidate the /explore page to fetch the new weekly featured users
  await res.revalidate("/explore");
}
