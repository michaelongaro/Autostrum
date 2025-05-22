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
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { tuningNotesToName } from "~/utils/tunings";

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

      const rawMiscStats = await ctx.prisma.tab.findMany({
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

      const topFiveMostViewedTabs = new Map<
        string,
        { id: number; title: string; value: string }
      >([
        ["1st", { id: 0, title: "", value: "" }],
        ["2nd", { id: 0, title: "", value: "" }],
        ["3rd", { id: 0, title: "", value: "" }],
        ["4th", { id: 0, title: "", value: "" }],
        ["5th", { id: 0, title: "", value: "" }],
      ]);
      const topFiveMostBookmarkedTabs = new Map<
        string,
        { id: number; title: string; value: string }
      >([
        ["1st", { id: 0, title: "", value: "" }],
        ["2nd", { id: 0, title: "", value: "" }],
        ["3rd", { id: 0, title: "", value: "" }],
        ["4th", { id: 0, title: "", value: "" }],
        ["5th", { id: 0, title: "", value: "" }],
      ]);
      const topFiveMostRatedTabs = new Map<
        string,
        { id: number; title: string; value: string }
      >([
        ["1st", { id: 0, title: "", value: "" }],
        ["2nd", { id: 0, title: "", value: "" }],
        ["3rd", { id: 0, title: "", value: "" }],
        ["4th", { id: 0, title: "", value: "" }],
        ["5th", { id: 0, title: "", value: "" }],
      ]);

      // add the top 5 most viewed tabs
      for (let i = 0; i < topViewedTabs.length; i++) {
        const tab = topViewedTabs[i];

        if (!tab) continue;

        topFiveMostViewedTabs.set(getOrdinalSuffix(i + 1), {
          id: tab.id,
          title: tab.title,
          value: `${tab.pageViews}`,
        });
      }

      // add the top 5 most bookmarked tabs
      for (let i = 0; i < topBookmarkedTabs.length; i++) {
        const tab = topBookmarkedTabs[i];

        if (!tab) continue;

        topFiveMostBookmarkedTabs.set(getOrdinalSuffix(i + 1), {
          id: tab.id,
          title: tab.title,
          value: `${tab.bookmarksCount}`,
        });
      }

      // add the top 5 most rated tabs
      for (let i = 0; i < topRatedTabs.length; i++) {
        const tab = topRatedTabs[i];

        if (!tab) continue;

        topFiveMostRatedTabs.set(getOrdinalSuffix(i + 1), {
          id: tab.id,
          title: tab.title,
          value: `${tab.averageRating} (${tab.ratingsCount})`,
        });
      }

      // Key is the ordinal number of the stat (1st, 2nd, 3rd, etc.)
      const topFiveStats: Map<
        string,
        {
          id: number;
          title: string;
          value: string;
        }
      >[] = [
        topFiveMostViewedTabs,
        topFiveMostBookmarkedTabs,
        topFiveMostRatedTabs,
      ];

      const miscStats: Map<string, number>[] = [];

      const genres = new Map<string, number>([
        ["Rock", 0],
        ["Indie", 0],
        ["Jazz", 0],
        ["Pop", 0],
        ["Folk", 0],
        ["Country", 0],
        ["Blues", 0],
        ["Hip-Hop", 0],
        ["Electronic", 0],
        ["Classical", 0],
        ["Metal", 0],
        ["Misc.", 0],
      ]);

      const tunings = new Map<string, number>([
        ["Standard", 0],
        ["Open A", 0],
        ["Open B", 0],
        ["Open C", 0],
        ["Open D", 0],
        ["Open E", 0],
        ["Open F", 0],
        ["Open G", 0],
        ["Drop A", 0],
        ["Drop A#", 0],
        ["Drop B", 0],
        ["Drop C", 0],
        ["Drop C#", 0],
        ["Drop D", 0],
        ["Drop D#", 0],
        ["Drop E", 0],
        ["Drop F", 0],
        ["Drop F#", 0],
        ["Drop G", 0],
        ["Drop G#", 0],
        ["Math Rock", 0],
        ["Rondeña", 0],
        ["Irish", 0],
        ["custom", 0],
      ]);

      const difficulties = new Map<string, number>([
        ["Beginner", 0],
        ["Easy", 0],
        ["Intermediate", 0],
        ["Advanced", 0],
        ["Expert", 0],
      ]);

      const capos = new Map<string, number>([
        ["None", 0],
        ["1st fret", 0],
        ["2nd fret", 0],
        ["3rd fret", 0],
        ["4th fret", 0],
        ["5th fret", 0],
        ["6th fret", 0],
        ["7th fret", 0],
        ["8th fret", 0],
        ["9th fret", 0],
        ["10th fret", 0],
        ["11th fret", 0],
        ["12th fret", 0],
      ]);

      const artists = new Map<string, number>();

      const difficultyIntToString = {
        0: "Beginner",
        1: "Easy",
        2: "Intermediate",
        3: "Advanced",
        4: "Expert",
      };

      // iterate through the rawMiscStats and increment the count for each row
      for (const stat of rawMiscStats) {
        const genreCount = genres.get(stat.genre);
        if (genreCount !== undefined) {
          genres.set(stat.genre, genreCount + 1);
        }

        const tuningNotesKey = stat.tuning as keyof typeof tuningNotesToName;
        const friendlyTuningName = tuningNotesToName[tuningNotesKey];

        const tuningCount = tunings.get(friendlyTuningName);
        if (tuningCount !== undefined) {
          tunings.set(friendlyTuningName, tuningCount + 1);
        }

        const difficulty =
          stat.difficulty as keyof typeof difficultyIntToString;
        const difficultyCount = difficulties.get(
          difficultyIntToString[difficulty],
        );
        if (difficultyCount !== undefined) {
          difficulties.set(
            difficultyIntToString[difficulty],
            difficultyCount + 1,
          );
        }

        const ordinalCapo =
          stat.capo === 0 ? "None" : getOrdinalSuffix(stat.capo + 1);
        const capoCount = capos.get(ordinalCapo);
        if (capoCount !== undefined) {
          capos.set(ordinalCapo, capoCount + 1);
        }

        const artistName = stat.artist ? stat.artist.name : user.username;
        const artistCount = artists.get(artistName);
        if (artistCount !== undefined) {
          artists.set(artistName, artistCount + 1);
        } else {
          artists.set(artistName, 1);
        }
      }

      return {
        ...user,
        topFiveStats,
        miscStats,
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
