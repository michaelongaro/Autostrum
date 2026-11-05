import { revalidatePath } from "next/cache";
import { env } from "~/env";
import { refreshWeeklyDiscovery } from "~/server/api/weeklyDiscovery";
import { prisma } from "~/server/db";

export async function GET(request: Request) {
  // make sure that the request is from Vercel's cron job
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    console.warn("Unauthorized cron attempt or missing authHeader.");
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await refreshWeeklyDiscovery(prisma);

    // Revalidate only after the transaction is successful
    revalidatePath("/explore");

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Weekly cron job failed:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
