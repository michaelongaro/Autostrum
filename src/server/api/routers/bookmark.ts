import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const bookmarkRouter = createTRPCRouter({
  addBookmark: protectedProcedure
    .input(
      z.object({
        tabId: z.number(),
        tabCreatorUserId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.userId;

      await ctx.prisma.bookmark.create({
        data: {
          tabId: input.tabId,
          tabCreatorUserId: input.tabCreatorUserId,
          bookmarkedByUserId: userId,
        },
      });

      // --- precomputed fields bookkeeping ---
      await ctx.prisma.user.update({
        where: {
          userId: input.tabCreatorUserId,
        },
        data: {
          totalBookmarksReceived: {
            increment: 1,
          },
        },
      });
    }),
  removeBookmark: protectedProcedure
    .input(
      z.object({
        tabId: z.number(),
        tabCreatorUserId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.userId;

      await ctx.prisma.bookmark.delete({
        where: {
          bookmarkedByUserId_tabId: {
            tabId: input.tabId,
            bookmarkedByUserId: userId,
          },
        },
      });

      // --- precomputed fields bookkeeping ---
      await ctx.prisma.user.update({
        where: {
          userId: input.tabCreatorUserId,
        },
        data: {
          totalBookmarksReceived: {
            decrement: 1,
          },
        },
      });
    }),
});
