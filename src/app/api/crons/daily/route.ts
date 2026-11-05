import { env } from "~/env";
import { prisma } from "~/server/db";

export async function GET(request: Request) {
  // make sure that the request is from Vercel's cron job
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    console.warn("Unauthorized cron attempt or missing authHeader.");
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // clear the daily tab view model (anti-spam dedupe window)
    await prisma.dailyTabView.deleteMany({});

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Cron job failed:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
