import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Tab } from "@prisma/client";
import { z } from "zod";
import { env } from "~/env";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export interface TabWithArtistName extends Tab {
  artistName?: string;
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

  //   const fullTab: TabWithArtistName = {
  //     ...tab,
  //     artistName: tab.artist?.name,
  //   };

  //   return fullTab;
  // }),

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

  createOrUpdate: protectedProcedure
    .input(
      z.object({
        type: z.enum(["create", "update"]),
        id: z.number().nullable(),
        createdByUserId: z.string(),
        title: z.string(),
        description: z.string().nullable(),
        genreId: z.number(),
        tuning: z.string(),
        bpm: z.number(),
        capo: z.number(),
        chords: z.array(chordSchema),
        strummingPatterns: z.array(strummingPatternSchema),
        tabData: z.array(sectionSchema),
        sectionProgression: z.array(sectionProgressionSchema),
        base64TabScreenshot: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const {
        type,
        id,
        createdByUserId,
        title,
        description,
        genreId,
        tuning,
        bpm,
        capo,
        chords,
        strummingPatterns,
        tabData,
        sectionProgression,
      } = input;

      const s3 = new S3Client({
        region: "us-east-2",
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const base64Data = input.base64TabScreenshot.split(",")[1]!;
      const imageBuffer = Buffer.from(base64Data, "base64");

      let tab: Tab | null = null;

      if (input.type === "create") {
        tab = await ctx.prisma.tab.create({
          data: {
            createdByUserId,
            title,
            description,
            genreId,
            tuning,
            sectionProgression,
            bpm,
            capo,
            chords,
            strummingPatterns,
            tabData,
          },
        });

        if (tab) {
          // immediately revalidate the tab's page before s3 upload to improve end user experience
          await ctx.res.revalidate(
            `/tab/?title=${encodeURIComponent(tab.title)}&id=${tab.id}`,
          );
        }

        // uploading screenshot to s3 bucket
        const command = new PutObjectCommand({
          Bucket: "autostrum-screenshots",
          Key: `${tab.id}.jpeg`,
          Body: imageBuffer,
          ContentType: "image/jpeg",
        });
        await getSignedUrl(s3, command, { expiresIn: 15 * 60 }); // expires in 15 minutes

        try {
          const res = await s3.send(command);
          console.log(res);
        } catch (e) {
          console.log(e);
          // return null;
        }

        // increment the tabCreator's number of tabs
        await ctx.prisma.user.update({
          where: {
            userId: createdByUserId,
          },
          data: {
            totalTabs: {
              increment: 1,
            },
          },
        });
      } else if (type === "update" && id !== null) {
        tab = await ctx.prisma.tab.update({
          where: {
            id,
          },
          data: {
            title,
            description,
            genreId,
            tuning,
            sectionProgression,
            bpm,
            capo,
            chords,
            strummingPatterns,
            tabData,
          },
        });

        if (tab) {
          // immediately revalidate the tab's page before s3 upload to improve end user experience
          await ctx.res.revalidate(
            `/tab/?title=${encodeURIComponent(tab.title)}&id=${tab.id}`,
          );
        }

        // uploading screenshot to s3 bucket
        const command = new PutObjectCommand({
          Bucket: "autostrum-screenshots",
          Key: `${input.id}.jpeg`,
          Body: imageBuffer,
          ContentType: "image/jpeg",
        });
        await getSignedUrl(s3, command, { expiresIn: 15 * 60 }); // expires in 15 minutes

        try {
          const res = await s3.send(command);
          console.log(res);
        } catch (e) {
          console.log(e);
          // return null;
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
        Key: `${idToDelete}.webm`,
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
