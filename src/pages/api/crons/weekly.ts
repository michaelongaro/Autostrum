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
    // Get the top users based on weekly tab views
    const topUsersFromViews = await prisma.weeklyUserTotalTabView.findMany({
      orderBy: {
        totalTabPageViews: "desc",
      },
      take: 5,
    });

    let featuredUsersData = topUsersFromViews.map((user) => ({
      userId: user.userId,
    }));

    // Check if we need to add filler users to reach the target of 5
    const needed = 5 - featuredUsersData.length;

    if (needed > 0) {
      const existingUserIds = featuredUsersData.map((user) => user.userId);

      // Fetch additional users to fill the remaining spots
      const fillerUsers = await prisma.user.findMany({
        take: needed,
        where: {
          // Ensure we don't select users who are already in the top list
          userId: {
            notIn: existingUserIds,
          },
        },
        // Order by a metric like total views to select other popular users
        orderBy: {
          totalTabViews: "desc",
        },
      });

      const fillerUsersData = fillerUsers.map((user) => ({
        userId: user.userId,
      }));

      // Combine the top users with the filler users
      featuredUsersData = [...featuredUsersData, ...fillerUsersData];
    }

    // Perform all related write operations within a transaction for consistency
    await prisma.$transaction([
      // Clear the previous weekly featured users
      prisma.weeklyFeaturedUser.deleteMany({}),

      // Set the new weekly featured users
      prisma.weeklyFeaturedUser.createMany({
        data: featuredUsersData,
        skipDuplicates: true, // Good practice, though logic should prevent duplicates
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
