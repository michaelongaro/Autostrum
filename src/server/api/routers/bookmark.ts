import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { serializableTransaction } from "~/server/api/transactions";

const bookmarkInput = z.object({
  tabId: z.number().int().positive(),
  // Accepted for older clients; the database determines the recipient.
  tabCreatorUserId: z.string().optional(),
});

export const bookmarkRouter = createTRPCRouter({
  addBookmark: protectedProcedure
    .input(bookmarkInput)
    .mutation(({ input, ctx }) =>
      serializableTransaction(ctx.prisma, async (tx) => {
        const tab = await tx.tab.findUnique({
          where: { id: input.tabId },
          select: { createdByUserId: true },
        });
        if (!tab) throw new TRPCError({ code: "NOT_FOUND" });
        const added = await tx.bookmark.createMany({
          data: {
            tabId: input.tabId,
            tabCreatorUserId: tab.createdByUserId,
            bookmarkedByUserId: ctx.auth.userId,
          },
          skipDuplicates: true,
        });
        if (added.count && tab.createdByUserId) {
          await tx.user.update({
            where: { userId: tab.createdByUserId },
            data: { totalBookmarksReceived: { increment: 1 } },
          });
        }
      }),
    ),
  removeBookmark: protectedProcedure
    .input(bookmarkInput)
    .mutation(({ input, ctx }) =>
      serializableTransaction(ctx.prisma, async (tx) => {
        const bookmark = await tx.bookmark.findUnique({
          where: {
            bookmarkedByUserId_tabId: {
              tabId: input.tabId,
              bookmarkedByUserId: ctx.auth.userId,
            },
          },
          select: { tabCreatorUserId: true },
        });
        if (!bookmark) return;
        await tx.bookmark.delete({
          where: {
            bookmarkedByUserId_tabId: {
              tabId: input.tabId,
              bookmarkedByUserId: ctx.auth.userId,
            },
          },
        });
        if (bookmark.tabCreatorUserId) {
          await tx.user.update({
            where: { userId: bookmark.tabCreatorUserId },
            data: { totalBookmarksReceived: { decrement: 1 } },
          });
        }
      }),
    ),
});
