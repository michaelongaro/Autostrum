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
    // Get the needed data before starting the transaction
    const topFiveUsers = await prisma.weeklyUserTotalTabView.findMany({
      orderBy: {
        totalTabPageViews: "desc",
      },
      take: 5,
    });

    // Perform all related write operations within a transaction for consistency
    await prisma.$transaction([
      // Clear the previous weekly featured users
      prisma.weeklyFeaturedUser.deleteMany({}),

      // Set the new weekly featured users
      prisma.weeklyFeaturedUser.createMany({
        data: topFiveUsers.map((user) => ({
          userId: user.userId,
        })),
      }),

      // Clear the source data for the next cycle
      prisma.weeklyUserTotalTabView.deleteMany({}),
    ]);

    // Revalidate only after the transaction is successful
    await res.revalidate("/explore");

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Weekly cron job failed:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    await prisma.$disconnect();
  }
}
