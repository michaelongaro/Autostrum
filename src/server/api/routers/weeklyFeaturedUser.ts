import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const weeklyFeaturedUserRouter = createTRPCRouter({
  getUserId: publicProcedure.query(async ({ ctx }) => {
    const artist = await ctx.prisma.weeklyFeaturedUser.findUnique({
      where: {
        id: 1,
      },
    });

    return artist?.userId;
  }),
});
