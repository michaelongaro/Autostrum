import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import type { User } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { env } from "~/env";

export interface UserMetadata extends User {
  bookmarkedTabIds: number[];
}

export const userRouter = createTRPCRouter({
  isUserRegistered: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: userId }) => {
      const user = await ctx.prisma.user.findFirst({
        where: {
          userId,
        },
        select: {
          userId: true, // prisma throws runtime error if select is empty
        },
      });

      return Boolean(user);
    }),

  getById: publicProcedure
    .input(z.string())
    .query(async ({ input: userId, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: {
          userId,
        },
        include: {
          bookmarks: {
            select: {
              tabId: true,
            },
          },
        },
      });

      if (!user) return null;

      const userMetadata: UserMetadata = {
        ...user,
        bookmarkedTabIds:
          user.bookmarks?.map((bookmark) => bookmark.tabId) ?? [],
      };

      return userMetadata;
    }),

  // fyi: used *only* on when visiting a user's profile page, and simply
  // returns the user's userId. Makes optimistic updates easier by only having
  // one key to invalidate/modify the data for.
  getByUsername: publicProcedure
    .input(z.string())
    .query(async ({ input: username, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: {
          username,
        },
        select: {
          userId: true,
        },
      });

      if (!user) return null;

      return user.userId;
    }),

  update: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        username: z.string().optional(),
        profileImageUrl: z.string().optional(),
        pinnedTabId: z.number().optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      const { userId, username, profileImageUrl, pinnedTabId } = input;

      return ctx.prisma.user.update({
        where: {
          userId,
        },
        data: {
          username,
          profileImageUrl,
          pinnedTabId,
        },
      });
    }),

  delete: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        anonymizeUserTabs: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { userId, anonymizeUserTabs } = input;

      const clerk = await clerkClient();
      await clerk.users.deleteUser(userId);

      await ctx.prisma.user.delete({
        where: {
          userId: userId,
        },
      });

      // --- artist: precomputed fields bookkeeping ---
      // get total number of tabs user created w/ an associated artistId
      const tabsWithAssociatedArtist = await ctx.prisma.tab.groupBy({
        by: ["artistId"],
        where: {
          createdByUserId: userId,
          artistId: {
            not: null,
          },
        },
        _count: {
          _all: true, // just counting the number of rows, not by any specific field
        },
      });

      // apply the changes to the artist's precomputed fields
      for (const { artistId, _count } of tabsWithAssociatedArtist) {
        const artist = await ctx.prisma.artist.findUnique({
          where: {
            id: artistId!,
          },
        });

        if (!artist) continue;

        const newTabCount = artist.totalTabs - _count._all;

        await ctx.prisma.artist.update({
          where: {
            id: artistId!,
          },
          data: {
            totalTabs: newTabCount,
          },
        });
      }

      // get total number of bookmarks associated with the user
      const bookmarks = await ctx.prisma.bookmark.groupBy({
        by: ["tabCreatorUserId"],
        where: {
          bookmarkedByUserId: userId,
        },
        _count: {
          _all: true,
        },
      });

      // apply the changes to each user's precomputed fields
      for (const { tabCreatorUserId, _count } of bookmarks) {
        const user = await ctx.prisma.user.findUnique({
          where: {
            userId: tabCreatorUserId,
          },
        });

        if (!user) continue;

        const newTotalBookmarksReceived =
          user.totalBookmarksReceived - _count._all;

        await ctx.prisma.user.update({
          where: {
            userId: tabCreatorUserId,
          },
          data: {
            totalBookmarksReceived: newTotalBookmarksReceived,
          },
        });
      }

      let userIdsThatNeedRatingsRecalculated = [];
      let userIdsThatNeedBookmarksRecalculated = [];

      // get all unique userIds that the user rated
      // Step 1: Get all tabIds the user rated
      const ratedTabIds = await ctx.prisma.tabRating.findMany({
        where: { userId: userId },
        select: { tabId: true },
      });

      // Step 2: Get all unique createdByUserIds for those tabs
      const uniqueUserIds = await ctx.prisma.tab.findMany({
        where: {
          id: { in: ratedTabIds.map((r) => r.tabId) },
          createdByUserId: { not: null },
        },
        select: { createdByUserId: true },
        distinct: ["createdByUserId"],
      });

      // Step 3: Extract the userIds
      userIdsThatNeedRatingsRecalculated = uniqueUserIds.map(
        (t) => t.createdByUserId,
      );

      // get all unique userIds that the user bookmarked
      // Step 1: Get all tabIds the user bookmarked
      const bookmarkedTabIds = await ctx.prisma.bookmark.findMany({
        where: { bookmarkedByUserId: userId },
        select: { tabId: true },
      });

      // Step 2: Get all unique createdByUserIds for those tabs
      const uniqueUserIdsForBookmarks = await ctx.prisma.tab.findMany({
        where: {
          id: { in: bookmarkedTabIds.map((r) => r.tabId) },
          createdByUserId: { not: null },
        },
        select: { createdByUserId: true },
        distinct: ["createdByUserId"],
      });

      // Step 3: Extract the userIds
      userIdsThatNeedBookmarksRecalculated = uniqueUserIdsForBookmarks.map(
        (t) => t.createdByUserId,
      );

      if (anonymizeUserTabs) {
        // user allowed the tabs to be preserved, just removing the createdByUserId field from them
        await ctx.prisma.tab.updateMany({
          where: {
            createdByUserId: userId,
          },
          data: {
            createdByUserId: null,
          },
        });
      } else {
        // delete all artist's tabs

        // get all tabIds that the user created
        const tabIds = await ctx.prisma.tab.findMany({
          where: {
            createdByUserId: userId,
          },
          select: {
            id: true,
          },
        });

        await ctx.prisma.tab.deleteMany({
          where: {
            createdByUserId: userId,
          },
        });

        // delete all tab screenshots in S3 bucket
        const s3 = new S3Client({
          region: "us-east-2",
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          },
        });

        // Split tabIds into chunks of 1000 (S3 limit per request)
        const chunkSize = 1000;
        for (let i = 0; i < tabIds.length; i += chunkSize) {
          const chunk = tabIds.slice(i, i + chunkSize);

          const deleteParams = {
            Bucket: "autostrum-screenshots",
            Delete: {
              Objects: chunk.map(({ id: tabId }) => ({ Key: `${tabId}.webm` })),
              Quiet: false,
            },
          };

          try {
            const command = new DeleteObjectsCommand(deleteParams);
            const res = await s3.send(command);
            console.log(res);
          } catch (e) {
            console.error(e);
          }
        }
      }

      // --- user: precomputed fields bookkeeping ---

      // recompute the average rating and ratings count for each user
      for (const userId of userIdsThatNeedRatingsRecalculated) {
        if (!userId) continue;

        const tabs = await ctx.prisma.tab.findMany({
          where: {
            createdByUserId: userId,
          },
          include: {
            ratings: true,
          },
        });

        let totalRating = 0;
        let ratingsCount = 0;

        for (const tab of tabs) {
          totalRating += tab.averageRating * tab.ratingsCount;
          ratingsCount += tab.ratingsCount;
        }

        const newAverageRating =
          ratingsCount > 0 ? totalRating / ratingsCount : 0;

        await ctx.prisma.user.update({
          where: {
            userId,
          },
          data: {
            averageTabRating: newAverageRating,
            totalTabRatings: ratingsCount,
          },
        });
      }

      // decrement the total number of bookmarks for each user that the user bookmarked
      for (const userId of userIdsThatNeedBookmarksRecalculated) {
        if (!userId) continue;

        const newTotalBookmarksReceived = await ctx.prisma.bookmark.count({
          where: {
            tab: {
              createdByUserId: userId,
            },
          },
        });

        await ctx.prisma.user.update({
          where: {
            userId,
          },
          data: {
            totalBookmarksReceived: newTotalBookmarksReceived,
          },
        });
      }
    }),
});
