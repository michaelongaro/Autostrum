import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const bookmarkRouter = createTRPCRouter({
  addBookmark: protectedProcedure
    .input(
      z.object({
        tabId: z.number(),
        tabCreatorUserId: z.string(),
        bookmarkedByUserId: z.string(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return ctx.prisma.bookmark.create({
        data: {
          tabId: input.tabId,
          tabCreatorUserId: input.tabCreatorUserId,
          bookmarkedByUserId: input.bookmarkedByUserId,
        },
      });
    }),
  removeBookmark: protectedProcedure
    .input(
      z.object({
        tabId: z.number(),
        bookmarkedByUserId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.bookmark.delete({
        where: {
          bookmarkedByUserId_tabId: {
            tabId: input.tabId,
            bookmarkedByUserId: input.bookmarkedByUserId,
          },
        },
      });
    }),
});
