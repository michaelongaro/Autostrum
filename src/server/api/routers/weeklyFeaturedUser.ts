import type { User } from "@prisma/client";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export interface UserMetadata extends User {
  bookmarkCount: number;
  numberOfTabs: number;
  bookmarkedTabIds: number[];
}

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
