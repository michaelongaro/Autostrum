import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const likeRouter = createTRPCRouter({
  createLike: protectedProcedure
    .input(
      z.object({
        tabId: z.number(),
        tabArtistId: z.string(),
        tabArtistUsername: z.string(),
        artistWhoLikedId: z.string(),
      })
    )
    .mutation(({ input, ctx }) => {
      return ctx.prisma.like.create({
        data: {
          tabId: input.tabId,
          tabArtistId: input.tabArtistId,
          tabArtistUsername: input.tabArtistUsername,
          artistWhoLikedId: input.artistWhoLikedId,
        },
      });
    }),
  deleteLike: protectedProcedure
    .input(
      z.object({
        tabId: z.number(),
        artistWhoLikedId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // basically is findUnique here
      const like = await ctx.prisma.like.findFirst({
        where: {
          tabId: input.tabId,
          artistWhoLikedId: input.artistWhoLikedId,
        },
      });

      return ctx.prisma.like.delete({
        where: {
          id: like?.id,
        },
      });
    }),
});
