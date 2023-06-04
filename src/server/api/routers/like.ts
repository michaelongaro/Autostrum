import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const likeRouter = createTRPCRouter({
  // technically should be private, but don't have to worry about auth yet
  toggleLike: publicProcedure
    .input(
      z.object({
        tabId: z.number(),
        userId: z.string(),
        likeId: z.number().nullable(),
      })
    )
    .mutation(({ input, ctx }) => {
      if (input.likeId) {
        return ctx.prisma.likes.delete({
          where: {
            id: input.likeId,
          },
        });
      } else {
        return ctx.prisma.likes.create({
          data: {
            tabId: input.tabId,
            userId: input.userId,
          },
        });
      }
    }),

  getLikeId: publicProcedure
    .input(
      z.object({
        tabId: z.number(),
        userId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await ctx.prisma.likes.findMany({
        where: {
          tabId: input.tabId,
        },
      });

      for (const like of result) {
        if (like.userId === input.userId) {
          return like.id;
        }
      }

      return null;
    }),

  // Don't think there is a compelling reason to have a separate tabIsLikedByCurrentUser query
  // when we have this and can just .includes on result of this query
  getUsersWhoLikedTabById: publicProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
      const result = await ctx.prisma.likes.findMany({
        where: {
          tabId: input,
        },
      });

      // ->>> actually maybe just have this function return total number of likes?

      // filter result to just return userIds
      const userIds = result.map((like) => like.userId);
      return userIds;
    }),
});
