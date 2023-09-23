import type { Artist } from "@prisma/client";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export interface ArtistMetadata extends Artist {
  numberOfLikes: number;
  numberOfTabs: number;
  likedTabIds: number[];
}

export const weeklyFeaturedArtistRouter = createTRPCRouter({
  getIdOfWeeklyFeaturedArtist: publicProcedure.query(async ({ ctx }) => {
    const artist = await ctx.prisma.weeklyFeaturedArtist.findUnique({
      where: {
        id: 1,
      },
    });

    return artist?.artistId;
  }),
});
