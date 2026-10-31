import { deleteUserData } from "~/server/api/userDeletion";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import type { User } from "~/generated/client";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { env } from "~/env";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { getTabScreenshotObjectKeys } from "~/utils/tabScreenshotMasks";
import { getTuningName, tunings as defaultTunings } from "~/utils/tunings";

export interface UserMetadata extends User {
  bookmarkedTabIds: number[];
}

function base64ToBlob(base64: string, contentType = "image/jpeg"): Blob {
  // Remove the data URL part if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  return new Blob([buffer], { type: contentType });
}

export const userRouter = createTRPCRouter({
  isUserRegistered: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.userId;

    if (!userId) return false;

    const user = await ctx.prisma.user.findUnique({
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
            where: {
              bookmarkedByUserId: ctx.auth.userId === userId ? userId : "",
            },
            select: {
              tabId: true,
            },
          },
        },
      });

      if (!user) return null;

      const { bookmarks, ...profile } = user;
      const userMetadata: UserMetadata = {
        ...profile,
        bookmarkedTabIds: bookmarks.map((bookmark) => bookmark.tabId),
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

      if (user.pinnedTabId) {
        minimalPinnedTab = await ctx.prisma.tab.findUnique({
          where: {
            id: user.pinnedTabId,
          },
          select: {
            id: true,
            title: true,
            genre: true,
            createdAt: true,
            updatedAt: true,
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

  isUsernameAvailable: protectedProcedure
    .input(z.string())
    .query(async ({ input: username, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: {
          username,
        },
        select: {
          userId: true, // prisma throws runtime error if select is empty
        },
      });

      return !user;
    }),

  create: protectedProcedure
    .input(
      z.object({
        username: z.string().min(1).max(20),
        profileImageUrl: z.string(),
        color: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { username, profileImageUrl, color } = input;
      const userId = ctx.auth.userId;

      const user = await ctx.prisma.user.create({
        data: {
          userId,
          username,
          profileImageUrl,
          color,
        },
      });

      return user;
    }),

  updateColor: protectedProcedure
    .input(z.string())
    .mutation(async ({ input: color, ctx }) => {
      const userId = ctx.auth.userId;

      await ctx.prisma.user.update({
        where: {
          userId,
        },
        data: {
          color,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        username: z.string().min(1).max(20).optional(),
        newPassword: z.string().min(8).max(128).optional(),
        confirmPassword: z.string().min(8).max(128).optional(),
        newProfileImage: z.string().optional(), // base64 string
        profileImageUrl: z.string().optional(), // only used for inital account creation
        pinnedTabId: z.number().nullish().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const {
        username,
        newPassword,
        confirmPassword,
        newProfileImage, // base64 string
        profileImageUrl,
        pinnedTabId,
      } = input;

      const userId = ctx.auth.userId;

      if (newPassword && confirmPassword && newPassword !== confirmPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
      }

      let updatedClerkUser = null;

      if (newPassword || newProfileImage) {
        const clerk = await clerkClient();

        if (newPassword) {
          await clerk.users.updateUser(userId, {
            password: newPassword,
            skipPasswordChecks: true,
          });
        }

        if (newProfileImage) {
          const blob = base64ToBlob(newProfileImage, "image/jpeg");
          const newImageFile = new File([blob], "profileImage", {
            type: "image/jpeg",
          });

          updatedClerkUser = await clerk.users.updateUserProfileImage(userId, {
            file: newImageFile,
          });
        }
      }

      return ctx.prisma.user.update({
        where: {
          userId,
        },
        data: {
          username,
          profileImageUrl: updatedClerkUser
            ? updatedClerkUser.imageUrl
            : profileImageUrl,
          pinnedTabId,
        },
      });
    }),

  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.userId;

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
            isVerified: true,
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
      ...defaultTunings.map(({ name }) => [name, 0] as const),
      ["Custom", 0],
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
    const artistIsVerified = new Map<string, boolean>();

    const difficultyIntToString = {
      1: "Beginner",
      2: "Easy",
      3: "Intermediate",
      4: "Advanced",
      5: "Expert",
    };

    // iterate through the rawMiscStats and increment the count for each row
    for (const stat of rawMiscStats) {
      const genreCount = genres.get(stat.genre);
      if (genreCount !== undefined) {
        genres.set(stat.genre, genreCount + 1);
      }

      const friendlyTuningName = getTuningName(stat.tuning) ?? "Custom";

      const tuningCount = tunings.get(friendlyTuningName);
      if (tuningCount !== undefined) {
        tunings.set(friendlyTuningName, tuningCount + 1);
      }

      const difficulty = stat.difficulty as keyof typeof difficultyIntToString;
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
        stat.capo === 0 ? "None" : `${getOrdinalSuffix(stat.capo)} fret`;
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

      if (stat.artist && !artistIsVerified.has(artistName)) {
        artistIsVerified.set(artistName, stat.artist.isVerified);
      }
    }

    const artistsSortedByMostTabs = new Map(
      [...artists].sort((a, b) => b[1] - a[1]),
    );

    miscStats.push(
      genres,
      tunings,
      difficulties,
      capos,
      artistsSortedByMostTabs,
    );

    return {
      ...user,
      topFiveStats,
      miscStats,
      artistIsVerified,
    };
  }),

  delete: protectedProcedure
    .input(z.boolean())
    .mutation(async ({ input: anonymizeUserTabs, ctx }) => {
      const userId = ctx.auth.userId;

      const tabs = await deleteUserData(ctx.prisma, userId, anonymizeUserTabs);
      // External services run after the database transaction. Retrying deletion
      // is safe if Clerk fails after the database has committed.
      ctx.waitUntil(
        Promise.all(
          tabs.map(({ id, title }) =>
            ctx.res
              .revalidate(`/tab/${id}/${encodeURIComponent(title)}`)
              .catch((error: unknown) => {
                console.error("Error revalidating former user's tab:", error);
              }),
          ),
        ),
      );
      if (!anonymizeUserTabs && tabs.length > 0) {
        const s3 = new S3Client({
          region: "us-east-2",
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          },
        });
        ctx.waitUntil(
          (async () => {
            const objects = tabs.flatMap(({ id }) =>
              getTabScreenshotObjectKeys(id).map((Key) => ({ Key })),
            );
            for (let i = 0; i < objects.length; i += 1000) {
              await s3.send(
                new DeleteObjectsCommand({
                  Bucket: `autostrum-screenshots${env.NODE_ENV === "development" ? "-dev" : ""}`,
                  Delete: {
                    Objects: objects.slice(i, i + 1000),
                  },
                }),
              );
            }
          })().catch((error: unknown) =>
            console.error("Error deleting user screenshots:", error),
          ),
        );
      }
      const clerk = await clerkClient();
      await clerk.users.deleteUser(userId);
    }),
});
