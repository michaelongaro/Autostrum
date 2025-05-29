import { PrismaClient } from "@prisma/client";

export default async function handler() {
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
}
