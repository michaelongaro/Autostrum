import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { serializableTransaction } from "~/server/api/transactions";
import {
  refreshTabRatings,
  refreshUserStatistics,
} from "~/server/api/statistics";

export const tabRatingRouter = createTRPCRouter({
  rate: protectedProcedure
    .input(
      z.object({
        tabId: z.number().int().positive(),
        rating: z.number().int().min(1).max(5),
        tabCreatorUserId: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      serializableTransaction(ctx.prisma, async (tx) => {
        const tab = await tx.tab.findUnique({
          where: { id: input.tabId },
          select: { createdByUserId: true },
        });
        if (!tab) throw new TRPCError({ code: "NOT_FOUND" });
        await tx.tabRating.upsert({
          where: {
            userId_tabId: { userId: ctx.auth.userId, tabId: input.tabId },
          },
          create: {
            userId: ctx.auth.userId,
            tabId: input.tabId,
            value: input.rating,
          },
          update: { value: input.rating },
        });
        await refreshTabRatings(tx, [input.tabId]);
        if (tab.createdByUserId) {
          await refreshUserStatistics(tx, [tab.createdByUserId]);
        }
      }),
    ),
});
