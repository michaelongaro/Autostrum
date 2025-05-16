import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const tabRatingRouter = createTRPCRouter({
  rate: protectedProcedure
    .input(
      z.object({
        tabId: z.number(),
        rating: z.number().min(1).max(5),
        tabCreatorUserId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { tabId, rating, tabCreatorUserId } = input;
      const userId = ctx.auth.userId;

      const userAlreadyRated = await ctx.prisma.tabRating.findFirst({
        where: {
          userId: ctx.auth.userId,
          tabId,
        },
      });

      const tab = await ctx.prisma.tab.findUnique({
        where: {
          id: tabId,
        },
      });

      if (!tab) {
        throw new Error("Tab not found");
      }

      let newAverageRating: number;
      let newRatingsCount: number;

      if (userAlreadyRated) {
        // User is updating their existing rating
        newAverageRating =
          (tab.averageRating * tab.ratingsCount -
            userAlreadyRated.value +
            rating) /
          tab.ratingsCount;
        newRatingsCount = tab.ratingsCount;

        await ctx.prisma.tabRating.update({
          where: {
            userId_tabId: {
              userId: userId,
              tabId: tabId,
            },
          },
          data: {
            value: rating,
          },
        });
      } else {
        // User is submitting a new rating
        newAverageRating =
          (tab.averageRating * tab.ratingsCount + rating) /
          (tab.ratingsCount + 1);
        newRatingsCount = tab.ratingsCount + 1;

        await ctx.prisma.tabRating.create({
          data: {
            userId: userId,
            tabId: tabId,
            value: rating,
          },
        });
      }

      await ctx.prisma.tab.update({
        where: {
          id: tabId,
        },
        data: {
          averageRating: newAverageRating,
          ratingsCount: newRatingsCount,
        },
      });

      // --- precomputed fields bookkeeping ---
      if (tabCreatorUserId) {
        const tabCreator = await ctx.prisma.user.findUnique({
          where: {
            userId: tabCreatorUserId,
          },
        });

        if (!tabCreator) {
          throw new Error("Tab creator not found");
        }

        let newUserAverageRating: number;
        let newUserRatingsCount: number;

        if (userAlreadyRated) {
          // User is updating their existing rating
          newUserAverageRating =
            (tabCreator.averageTabRating * tabCreator.totalTabRatings -
              userAlreadyRated.value +
              rating) /
            tabCreator.totalTabRatings;
          newUserRatingsCount = tabCreator.totalTabRatings;
        } else {
          // User is submitting a new rating
          newUserAverageRating =
            (tabCreator.averageTabRating * tabCreator.totalTabRatings +
              rating) /
            (tabCreator.totalTabRatings + 1);
          newUserRatingsCount = tabCreator.totalTabRatings + 1;
        }

        await ctx.prisma.user.update({
          where: {
            userId: tabCreatorUserId,
          },
          data: {
            averageTabRating: newUserAverageRating,
            totalTabRatings: newUserRatingsCount,
          },
        });
      }
    }),
});
