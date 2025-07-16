import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Tab } from "@prisma/client";
import { z } from "zod";
import { env } from "~/env";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export interface TabWithArtistMetadata extends Tab {
  artistName?: string;
  artistIsVerified?: boolean;
}

// experimentally testing this zod schema from a typescript types -> zod converter online
const sectionProgressionSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  title: z.string(),
  repetitions: z.number(),
});

const chordSchema = z.object({
  id: z.string(),
  name: z.string(),
  frets: z.array(z.string()),
});

const strumSchema = z.object({
  palmMute: z.union([
    z.literal(""),
    z.literal("-"),
    z.literal("start"),
    z.literal("end"),
  ]),
  strum: z.string(), // not sure if there is any other way than listing out (basically) every permutation of "vu>.s"
});

const tabSectionSchema = z.object({
  id: z.string(),
  type: z.literal("tab"),
  bpm: z.number(),
  repetitions: z.number(),
  data: z.array(z.array(z.string())),
});

const strummingPatternSchema = z.object({
  id: z.string(),
  noteLength: z.union([
    z.literal("1/4th"),
    z.literal("1/4th triplet"),
    z.literal("1/8th"),
    z.literal("1/8th triplet"),
    z.literal("1/16th"),
    z.literal("1/16th triplet"),
  ]),
  strums: z.array(strumSchema),
});

const chordSequenceSchema = z.object({
  id: z.string(),
  strummingPattern: strummingPatternSchema,
  bpm: z.number(),
  repetitions: z.number(),
  data: z.array(z.string()),
});

const chordSectionSchema = z.object({
  id: z.string(),
  type: z.literal("chord"),
  bpm: z.number(),
  repetitions: z.number(),
  data: z.array(chordSequenceSchema),
});

const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  data: z.array(z.union([tabSectionSchema, chordSectionSchema])),
});

export const tabRouter = createTRPCRouter({
  // Currently not used, but keeping in case we need it in the future
  // get: publicProcedure.input(z.number()).query(async ({ input: id, ctx }) => {
  //   const tab = await ctx.prisma.tab.findUnique({
  //     where: {
  //       id,
  //     },
  //     include: {
  //       artist: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //     },
  //   });

  //   if (!tab) return null;

  //   const fullTab: TabWithArtistMetadata = {
  //     ...tab,
  //     artistName: tab.artist?.name,
  //   };

  //   return fullTab;
  // }),

  // only used in <PinnedTabSelector /> on user's settings page,
  // but doesn't need to be protected
  getTitle: protectedProcedure
    .input(z.number())
    .query(async ({ input: id, ctx }) => {
      const tab = await ctx.prisma.tab.findUnique({
        where: {
          id,
        },
        select: {
          title: true,
        },
      });

      if (!tab) return null;

      return tab.title;
    }),

  getTabsForPinnedTabSelector: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        sortBy: z.enum(["Newest", "Oldest", "Most popular", "Least popular"]),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { userId, sortBy } = input;

      const sortOptionsMap = {
        Newest: { createdAt: "desc" as const },
        Oldest: { createdAt: "asc" as const },
        "Most popular": { pageViews: "desc" as const },
        "Least popular": { pageViews: "asc" as const },
      };

      const orderBy = sortOptionsMap[sortBy];

      const tabs = await ctx.prisma.tab.findMany({
        where: {
          createdByUserId: userId,
        },
        select: {
          createdAt: true,
          id: true,
          title: true,
          pageViews: true,
        },
        orderBy,
      });

      return tabs;
    }),

  getRatingBookmarkAndViewCount: publicProcedure
    .input(z.number())
    .query(async ({ input: tabId, ctx }) => {
      const userId = ctx.auth.userId;

      const tab = await ctx.prisma.tab.findUnique({
        where: {
          id: tabId,
        },
        select: {
          averageRating: true,
          ratingsCount: true,
          pageViews: true,
          bookmarks: {
            where: userId ? { bookmarkedByUserId: userId } : undefined,
            select: {
              bookmarkedByUserId: true,
            },
            take: userId ? 1 : 0,
          },
          ratings: {
            where: userId ? { userId: userId } : undefined,
            select: {
              value: true,
            },
            take: userId ? 1 : 0,
          },
        },
      });

      if (!tab) return null;

      const bookmarked = tab.bookmarks.length > 0;
      const userRating =
        tab.ratings.length > 0 ? (tab.ratings[0]?.value ?? null) : null;

      return {
        averageRating: tab.averageRating,
        ratingsCount: tab.ratingsCount,
        pageViews: tab.pageViews,
        bookmarked,
        userRating,
      };
    }),

  processPageView: publicProcedure
    .input(
      z.object({
        tabId: z.number(),
        tabCreatorUserId: z.string().optional(),
        artistId: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { tabId, tabCreatorUserId, artistId } = input;

      const ipAddress =
        ctx.req.headers["x-forwarded-for"] || ctx.req.socket.remoteAddress;

      if (!ipAddress || typeof ipAddress !== "string") {
        throw new Error("IP address not found");
      }

      // make sure that the IP address is not already in the DailyTabView model for this tab
      const existingView = await ctx.prisma.dailyTabView.findUnique({
        where: {
          userIpAddress: ipAddress,
        },
      });

      if (existingView) return;

      // 1) increment the tab's page views
      await ctx.prisma.tab.update({
        where: {
          id: tabId,
        },
        data: {
          pageViews: {
            increment: 1,
          },
        },
      });

      // 2) add a new row to the DailyTabView model
      await ctx.prisma.dailyTabView.create({
        data: {
          userIpAddress: ipAddress,
          tabId,
        },
      });

      if (tabCreatorUserId) {
        // 3) increment the tabCreator's totalTabViews (if tabCreatorUserId is provided)
        await ctx.prisma.user.update({
          where: {
            userId: tabCreatorUserId,
          },
          data: {
            totalTabViews: {
              increment: 1,
            },
          },
        });

        // 4) increment the user's WeeklyTotalTabViews
        await ctx.prisma.weeklyUserTotalTabView.upsert({
          where: {
            userId: tabCreatorUserId,
          },
          update: {
            totalTabPageViews: {
              increment: 1,
            },
          },
          create: {
            userId: tabCreatorUserId,
            totalTabPageViews: 1,
          },
        });
      }

      if (artistId) {
        // 5) increment the artist's totalTabViews
        await ctx.prisma.artist.update({
          where: {
            id: artistId,
          },
          data: {
            totalViews: {
              increment: 1,
            },
          },
        });
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        createdByUserId: z.string(),
        title: z.string().max(50),
        artistId: z.number().nullable(),
        artistName: z.string().max(60).optional(),
        description: z.string().max(500).nullable(),
        genre: z.string(),
        tuning: z.string(),
        bpm: z.number(),
        capo: z.number(),
        key: z.string().nullable(),
        difficulty: z.number(),
        chords: z.array(chordSchema),
        strummingPatterns: z.array(strummingPatternSchema),
        tabData: z.array(sectionSchema),
        sectionProgression: z.array(sectionProgressionSchema),
        lightScreenshot: z.string(),
        darkScreenshot: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const {
        createdByUserId,
        title,
        artistId,
        artistName,
        description,
        genre,
        tuning,
        bpm,
        capo,
        key,
        difficulty,
        chords,
        strummingPatterns,
        tabData,
        sectionProgression,
        lightScreenshot,
        darkScreenshot,
      } = input;

      const tab = await ctx.prisma.tab.create({
        data: {
          title,
          description,
          genre,
          tuning,
          sectionProgression,
          bpm,
          capo,
          key,
          difficulty,
          chords,
          strummingPatterns,
          tabData,
          ...(createdByUserId
            ? { createdBy: { connect: { userId: createdByUserId } } }
            : {}), // FYI: even though createdByUserId will always be provided, since the field is optional
          // in our schema, prisma wants us to use the relation field.
          ...(artistId != null
            ? { artist: { connect: { id: artistId } } }
            : artistName
              ? {
                  artist: {
                    create: { name: artistName, isVerified: false },
                  },
                }
              : {}),
        },
      });

      // immediately revalidate the tab's page before s3 upload to improve end user experience
      ctx.res
        .revalidate(`/tab/${tab.id}/${encodeURIComponent(tab.title)}`)
        .catch((e) => {
          console.error("Error revalidating tab page:", e);
        });

      const s3 = new S3Client({
        region: "us-east-2",
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const lightBase64Data = lightScreenshot.split(",")[1]!;
      const lightImageBuffer = Buffer.from(lightBase64Data, "base64");

      const darkBase64Data = darkScreenshot.split(",")[1]!;
      const darkImageBuffer = Buffer.from(darkBase64Data, "base64");

      const lightCommand = new PutObjectCommand({
        Bucket: "autostrum-screenshots",
        Key: `${tab.id}/light.jpeg`,
        Body: lightImageBuffer,
        ContentType: "image/jpeg",
      });

      const darkCommand = new PutObjectCommand({
        Bucket: "autostrum-screenshots",
        Key: `${tab.id}/dark.jpeg`,
        Body: darkImageBuffer,
        ContentType: "image/jpeg",
      });

      // uploading screenshots to s3 bucket
      Promise.all([s3.send(lightCommand), s3.send(darkCommand)]).catch((e) => {
        console.error(e);
      });

      // increment the tabCreator's number of tabs
      ctx.prisma.user
        .update({
          where: {
            userId: createdByUserId,
          },
          data: {
            totalTabs: {
              increment: 1,
            },
          },
        })
        .catch((e) => {
          console.error("Error incrementing tabCreator's totalTabs:", e);
        });

      // increment the artist's number of tabs (if artistId is provided)
      if (tab.artistId) {
        ctx.prisma.artist
          .update({
            where: {
              id: tab.artistId,
            },
            data: {
              totalTabs: {
                increment: 1,
              },
            },
          })
          .catch((e) => {
            console.error("Error incrementing artist's totalTabs:", e);
          });
      }

      return tab;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().max(50),
        artistId: z.number().nullable(),
        artistName: z.string().max(60).optional(),
        description: z.string().max(500).nullable(),
        genre: z.string(),
        tuning: z.string(),
        bpm: z.number(),
        capo: z.number(),
        key: z.string().nullable(),
        difficulty: z.number(),
        chords: z.array(chordSchema),
        strummingPatterns: z.array(strummingPatternSchema),
        tabData: z.array(sectionSchema),
        sectionProgression: z.array(sectionProgressionSchema),
        lightScreenshot: z.string(),
        darkScreenshot: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const {
        id,
        title,
        artistId,
        artistName,
        description,
        genre,
        tuning,
        bpm,
        capo,
        key,
        difficulty,
        chords,
        strummingPatterns,
        tabData,
        sectionProgression,
        lightScreenshot,
        darkScreenshot,
      } = input;

      // need to know if artistId changed, since we will then need to update the old and new
      // artist's totalTabs
      const oldTab = await ctx.prisma.tab.findUnique({
        where: {
          id,
        },
        select: {
          artistId: true,
        },
      });

      const tab = await ctx.prisma.tab.update({
        where: {
          id,
        },
        data: {
          title,
          description,
          genre,
          tuning,
          sectionProgression,
          bpm,
          capo,
          key,
          difficulty,
          chords,
          strummingPatterns,
          tabData,
          ...(artistId != null
            ? { artist: { connect: { id: artistId } } }
            : artistName
              ? {
                  artist: {
                    create: { name: artistName, isVerified: false },
                  },
                }
              : {}),
        },
      });

      // immediately revalidate the tab's page before s3 upload to improve end user experience
      ctx.res
        .revalidate(`/tab/${tab.id}/${encodeURIComponent(tab.title)}`)
        .catch((e) => {
          console.error("Error revalidating tab page:", e);
        });

      const s3 = new S3Client({
        region: "us-east-2",
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const lightBase64Data = lightScreenshot.split(",")[1]!;
      const lightImageBuffer = Buffer.from(lightBase64Data, "base64");

      const darkBase64Data = darkScreenshot.split(",")[1]!;
      const darkImageBuffer = Buffer.from(darkBase64Data, "base64");

      const lightCommand = new PutObjectCommand({
        Bucket: "autostrum-screenshots",
        Key: `${tab.id}/light.jpeg`,
        Body: lightImageBuffer,
        ContentType: "image/jpeg",
      });

      const darkCommand = new PutObjectCommand({
        Bucket: "autostrum-screenshots",
        Key: `${tab.id}/dark.jpeg`,
        Body: darkImageBuffer,
        ContentType: "image/jpeg",
      });

      // uploading screenshots to s3 bucket
      Promise.all([s3.send(lightCommand), s3.send(darkCommand)]).catch((e) => {
        console.error(e);
      });

      // check if the artistId has changed
      if (oldTab?.artistId !== artistId) {
        // decrement the old artist's totalTabs
        if (oldTab?.artistId) {
          ctx.prisma.artist
            .update({
              where: {
                id: oldTab.artistId,
              },
              data: {
                totalTabs: {
                  decrement: 1,
                },
              },
            })
            .catch((e) => {
              console.error("Error decrementing old artist's totalTabs:", e);
            });
        }
        // increment the new artist's totalTabs
        if (artistId) {
          ctx.prisma.artist
            .update({
              where: {
                id: artistId,
              },
              data: {
                totalTabs: {
                  increment: 1,
                },
              },
            })
            .catch((e) => {
              console.error("Error incrementing new artist's totalTabs:", e);
            });
        }
      }

      return tab;
    }),

  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: idToDelete, ctx }) => {
      const tab = await ctx.prisma.tab.findUnique({
        where: {
          id: idToDelete,
        },
      });

      if (!tab) return null;

      const s3 = new S3Client({
        region: "us-east-2",
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const command = new DeleteObjectCommand({
        Bucket: "autostrum-screenshots",
        Key: `${idToDelete}.jpeg`,
      });

      try {
        const res = await s3.send(command);
        console.log(res);
      } catch (e) {
        console.log(e);
        // return null;
      }

      // if this tab is the tabCreator's pinned tab, then set the tabCreator's pinnedTabId to -1 (default value)
      if (tab.createdByUserId) {
        const tabCreator = await ctx.prisma.user.findUnique({
          where: {
            userId: tab.createdByUserId,
          },
        });

        if (tabCreator?.pinnedTabId === idToDelete) {
          await ctx.prisma.user.update({
            where: {
              id: tabCreator.id,
            },
            data: {
              pinnedTabId: -1,
            },
          });
        }
      }

      // --- pre-tab deletion: precomputed fields bookkeeping ---
      // count the number of bookmarks for this tab
      const existingBookmarks = await ctx.prisma.bookmark.count({
        where: {
          tabId: idToDelete,
        },
      });

      // delete tab row
      await ctx.prisma.tab.delete({
        where: {
          id: idToDelete,
        },
      });

      // --- post-tab deletion: precomputed fields bookkeeping ---
      if (tab.createdByUserId) {
        // recompute the tabCreator's average rating and total number of ratings
        const tabs = await ctx.prisma.tab.findMany({
          where: {
            createdByUserId: tab.createdByUserId,
          },
          select: {
            averageRating: true,
            ratingsCount: true,
          },
        });

        let totalRatings = 0;
        let weightedSum = 0;

        for (const t of tabs) {
          totalRatings += t.ratingsCount;
          weightedSum += t.averageRating * t.ratingsCount;
        }

        const newAverageRating =
          totalRatings > 0 ? weightedSum / totalRatings : 0;

        // update the tab creator's row w/ the new values
        await ctx.prisma.user.update({
          where: {
            userId: tab.createdByUserId,
          },
          data: {
            totalTabs: {
              decrement: 1,
            },
            totalTabViews: {
              decrement: tab.pageViews,
            },
            averageTabRating: newAverageRating,
            totalTabRatings: totalRatings,
            totalBookmarksReceived: {
              decrement: existingBookmarks,
            },
          },
        });
      }
    }),
});
