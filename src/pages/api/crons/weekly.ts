import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "~/env";
import { refreshWeeklyDiscovery } from "~/server/api/weeklyDiscovery";
import { prisma } from "~/server/db";

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

  try {
    await refreshWeeklyDiscovery(prisma);

    // Revalidate only after the transaction is successful
    await res.revalidate("/explore");

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Weekly cron job failed:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
