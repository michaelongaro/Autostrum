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

  getProfileMetadataByUsername: publicProcedure
    .input(z.string())
    .query(async ({ input: username, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: {
          username,
        },
      });

      if (!user) return null;

      let minimalPinnedTab = null;

      if (user.pinnedTabId !== -1) {
        minimalPinnedTab = await ctx.prisma.tab.findUnique({
          where: {
            id: user.pinnedTabId,
          },
          select: {
            id: true,
            title: true,
            genre: true,
            createdAt: true,
            difficulty: true,
            averageRating: true,
            ratingsCount: true,
            artist: {
              select: {
                id: true,
                name: true,
                isVerified: true,
              },
            },
            createdBy: {
              // not really necessary, but keeping to satisfy type for now
              select: {
                userId: true,
                username: true,
              },
            },
          },
        });
      }

      return {
        user,
        pinnedTab: minimalPinnedTab,
      };
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

  getStatistics: protectedProcedure
    .input(z.string())
    .query(async ({ input: userId, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: {
          userId,
        },
      });

      if (!user) return null;

      // Fetch user's top 5 most viewed tabs / most bookmarked tabs / highest rated tabs
      const [topViewedTabs, rawTopBookmarkedTabs, topRatedTabs] =
        await Promise.all([
          ctx.prisma.tab.findMany({
            where: {
              createdByUserId: userId,
            },
            select: {
              id: true,
              title: true,
              pageViews: true,
            },
            orderBy: {
              pageViews: "desc",
            },
            take: 5,
          }),
          ctx.prisma.tab.findMany({
            where: {
              createdByUserId: userId,
            },
            select: {
              id: true,
              title: true,
              _count: {
                select: {
                  bookmarks: true,
                },
              },
            },
            orderBy: {
              bookmarks: {
                _count: "desc",
              },
            },
            take: 5,
          }),
          ctx.prisma.tab.findMany({
            where: {
              createdByUserId: userId,
            },
            select: {
              id: true,
              title: true,
              averageRating: true,
              ratingsCount: true,
            },
            orderBy: {
              averageRating: "desc",
            },
            take: 5,
          }),
        ]);

      const topBookmarkedTabs = rawTopBookmarkedTabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        bookmarksCount: tab._count.bookmarks,
      }));

      const miscStats = await ctx.prisma.tab.findMany({
        where: {
          createdByUserId: userId,
        },
        select: {
          genre: true,
          tuning: true,
          capo: true,
          difficulty: true,
          artist: {
            select: {
              name: true,
            },
          },
        },
      });

      const genres = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
        9: 0,
        10: 0,
        11: 0,
        12: 0,
      };

      const tunings = {
        "e2 a2 d3 g3 b3 e4": 0,
        "e2 a2 c#3 e3 a3 e4": 0,
        "b1 f#2 b2 f#3 b3 d#4": 0,
        "c2 g2 c3 g3 c4 e4": 0,
        "d2 a2 d3 f#3 a3 d4": 0,
        "e2 b2 e3 g#3 b3 e4": 0,
        "c2 f2 c3 f3 a3 f4": 0,
        "d2 g2 d3 g3 b3 d4": 0,
        "a1 e2 a2 d3 f#3 b3": 0,
        "a#1 f2 a#2 d#3 g3 c4": 0,
        "b1 f#2 b2 e3 g#3 c#4": 0,
        "c2 g2 c3 f3 a3 d4": 0,
        "c#2 g#2 c#3 f#3 a#3 d#4": 0,
        "d2 a2 d3 g3 b3 e4": 0,
        "d#2 a#2 d#3 g#3 c4 f4": 0,
        "e2 b2 e3 a3 c#4 f#4": 0,
        "f2 c3 f3 a#3 d4 g4": 0,
        "f#2 c#3 f#3 b3 d#4 g#4": 0,
        "g1 d2 g2 c3 e3 a3": 0,
        "g#1 d#2 g#2 c#3 f3 a#3": 0,
        "f2 a2 c3 g3 c4 e4": 0,
        "d2 a2 d3 f#3 b3 e4": 0,
        "d2 a2 d3 g3 a3 d4": 0,
        custom: 0,
      };

      const difficulties = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      return {
        ...user,
        topViewedTabs,
        topBookmarkedTabs,
        topRatedTabs,
      };
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
        if (!tabCreatorUserId) continue;

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
