import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Tab } from "~/generated/client";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { serializableTransaction } from "~/server/api/transactions";
import {
  refreshArtistStatistics,
  refreshUserStatistics,
} from "~/server/api/statistics";
import { env } from "~/env";
import {
  chordSchema,
  strummingPatternSchema,
  sectionProgressionSchema,
  sectionSchema,
  draftReferenceSchema,
} from "~/utils/tabDocument";
import {
  claimDraftForPublication,
  finishDraftPublication,
} from "~/server/api/draftPersistence";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export interface TabWithArtistMetadata extends Tab {
  artistId: number | null;
  artistName?: string;
  artistIsVerified?: boolean;
}

// Helper function to trigger screenshot capture
async function triggerScreenshotCapture(
  tabId: number,
  tabTitle: string,
): Promise<void> {
  const screenshotServerUrl = env.SCREENSHOT_SERVER_URL;
  const screenshotSecret = env.SCREENSHOT_SECRET;

  if (!screenshotServerUrl || !screenshotSecret) {
    console.warn(
      "Screenshot server not configured, skipping screenshot capture",
    );
    return;
  }

  try {
    const response = await fetch(`${screenshotServerUrl}/screenshot/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tabId,
        tabTitle,
        type:
          process.env.NODE_ENV === "development" ? "development" : "production",
        secret: screenshotSecret,
      }),
    });

    if (!response.ok) {
      const error: unknown = await response.json();
      console.error("Screenshot capture failed:", error);
    }
  } catch (error) {
    console.error("Failed to trigger screenshot capture:", error);
  }
}

// Helper function to prune redundant chord repetitions in ChordSections
function pruneChordSections(
  sections: z.infer<typeof sectionSchema>[],
): z.infer<typeof sectionSchema>[] {
  return sections.map((section) => ({
    ...section,
    data: section.data.map((subsection) => {
      if (subsection.type !== "chord") return subsection;

      return {
        ...subsection,
        data: subsection.data.map((chordSequence) => {
          const prunedChordData: string[] = [];
          let prevChord = "";

          for (const chord of chordSequence.data) {
            if (chord !== prevChord && chord !== "") {
              prunedChordData.push(chord);
              prevChord = chord;
            } else {
              prunedChordData.push("");
            }
          }

          return {
            ...chordSequence,
            data: prunedChordData,
          };
        }),
      };
    }),
  }));
}

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
  // but doesn't strictly need to be a protected procedure
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
    .input(z.enum(["Newest", "Oldest", "Most popular", "Least popular"]))
    .query(async ({ input: sortBy, ctx }) => {
      const userId = ctx.auth.userId;

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
        tabId: z.number().int().positive(),
        tabCreatorUserId: z.string().optional(),
        artistId: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const forwarded = ctx.req.headers["x-forwarded-for"];
      const ipAddress =
        (Array.isArray(forwarded) ? forwarded[0] : forwarded)
          ?.split(",")[0]
          ?.trim() || ctx.req.socket.remoteAddress;
      if (!ipAddress)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "IP address not found",
        });

      await serializableTransaction(ctx.prisma, async (tx) => {
        const tab = await tx.tab.findUnique({
          where: { id: input.tabId },
          select: { createdByUserId: true, artistId: true },
        });
        if (!tab) throw new TRPCError({ code: "NOT_FOUND" });
        const inserted = await tx.dailyTabView.createMany({
          data: { userIpAddress: ipAddress, tabId: input.tabId },
          skipDuplicates: true,
        });
        if (inserted.count === 0) return;
        // Engagement must not invalidate an editor's baseUpdatedAt version.
        await tx.$executeRaw`UPDATE "Tab" SET "pageViews" = "pageViews" + 1 WHERE id = ${input.tabId}`;
        if (tab.createdByUserId) {
          await tx.user.update({
            where: { userId: tab.createdByUserId },
            data: { totalTabViews: { increment: 1 } },
          });
          await tx.weeklyUserTotalTabView.upsert({
            where: { userId: tab.createdByUserId },
            create: { userId: tab.createdByUserId, totalTabPageViews: 1 },
            update: { totalTabPageViews: { increment: 1 } },
          });
        }
        await tx.weeklyTabView.upsert({
          where: { tabId: input.tabId },
          create: { tabId: input.tabId, pageViews: 1 },
          update: { pageViews: { increment: 1 } },
        });
        if (tab.artistId) {
          await tx.artist.update({
            where: { id: tab.artistId },
            data: { totalViews: { increment: 1 } },
          });
        }
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        draft: draftReferenceSchema.optional(),
        title: z.string().max(50),
        artistId: z.number().nullable(),
        artistName: z.string().max(60).optional(),
        description: z.string().max(500).nullable(),
        genre: z.string(),
        tuning: z.string(),
        bpm: z.number(),
        capo: z.number(),
        key: z.string().nullable(),
        difficulty: z.number().int().min(1).max(5),
        chords: z.array(chordSchema),
        strummingPatterns: z.array(strummingPatternSchema),
        sectionProgression: z.array(sectionProgressionSchema),
        tabData: z.array(sectionSchema),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const prunedTabData = pruneChordSections(input.tabData);

      const {
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
        sectionProgression,
      } = input;

      const tabData = prunedTabData;

      const userId = ctx.auth.userId;

      const { tab, replayed } = await serializableTransaction(
        ctx.prisma,
        async (tx) => {
          const replay = await claimDraftForPublication(
            tx,
            input.draft,
            userId,
            null,
          );
          if (replay) return { tab: replay, replayed: true };
          const tab = await tx.tab.create({
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
              ...(userId ? { createdBy: { connect: { userId: userId } } } : {}),
              // FYI: even though userId will always be provided, since the field is optional
              // in our schema, prisma wants us to use the relation field.
              ...(artistId != null
                ? { artist: { connect: { id: artistId } } }
                : artistName
                  ? {
                      artist: {
                        create: {
                          name: artistName,
                          isVerified: false,
                          totalTabs: 1,
                          totalViews: 0,
                        },
                      },
                    }
                  : {}),
            },
          });

          await tx.user.update({
            where: { userId },
            data: { totalTabs: { increment: 1 } },
          });
          if (artistId !== null) {
            await tx.artist.update({
              where: { id: artistId },
              data: { totalTabs: { increment: 1 } },
            });
          }
          await finishDraftPublication(tx, input.draft, tab.id);
          return { tab, replayed: false };
        },
      );
      if (replayed) return tab;

      // immediately revalidate the tab's url to improve end user experience
      await ctx.res
        .revalidate(`/tab/${tab.id}/${encodeURIComponent(tab.title)}`)
        .catch((e) => {
          console.error("Error revalidating tab page:", e);
        });

      // Trigger screenshot capture in background (runs after response is sent)
      ctx.waitUntil(
        triggerScreenshotCapture(tab.id, tab.title).catch((e) =>
          console.error("Screenshot capture error:", e),
        ),
      );

      return tab;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        draft: draftReferenceSchema.optional(),
        title: z.string().max(50),
        artistId: z.number().nullable(),
        artistName: z.string().max(60).optional(),
        description: z.string().max(500).nullable(),
        genre: z.string(),
        tuning: z.string(),
        bpm: z.number(),
        capo: z.number(),
        key: z.string().nullable(),
        difficulty: z.number().int().min(1).max(5),
        chords: z.array(chordSchema),
        strummingPatterns: z.array(strummingPatternSchema),
        sectionProgression: z.array(sectionProgressionSchema),
        tabData: z.array(sectionSchema),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const prunedTabData = pruneChordSections(input.tabData);

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
        sectionProgression,
      } = input;

      const tabData = prunedTabData;

      // need to know if artistId changed, since we will then need to update the old and new
      // artist's totalTabs
      const { tab, replayed } = await serializableTransaction(
        ctx.prisma,
        async (tx) => {
          const prevTabVersion = await tx.tab.findUnique({
            where: {
              id,
            },
            select: {
              updatedAt: true,
              artistId: true,
              pageViews: true, // used to update the artist's totalViews
              createdByUserId: true,
            },
          });

          // only the tab creator can update their tab
          if (prevTabVersion?.createdByUserId !== ctx.auth.userId) {
            throw new Error("Unable to find tab or unauthorized");
          }

          const replay = await claimDraftForPublication(
            tx,
            input.draft,
            ctx.auth.userId,
            id,
          );
          if (replay) return { tab: replay, prevTabVersion, replayed: true };
          const tab = await tx.tab
            .update({
              where: {
                id,
                updatedAt: prevTabVersion.updatedAt,
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
                ...(artistId !== null
                  ? { artist: { connect: { id: artistId } } }
                  : artistName
                    ? {
                        artist: {
                          create: {
                            name: artistName,
                            isVerified: false,
                            totalTabs: 1,
                            totalViews: prevTabVersion.pageViews,
                          },
                        },
                      }
                    : { artist: { disconnect: true } }),
              },
            })
            .catch((error: unknown) => {
              if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "P2025"
              ) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message:
                    "The published tab changed in another session. Your private draft has been kept.",
                });
              }
              throw error;
            });

          if (prevTabVersion.artistId !== tab.artistId) {
            await refreshArtistStatistics(
              tx,
              [prevTabVersion.artistId, tab.artistId].filter(
                (id): id is number => id !== null,
              ),
            );
          }
          await finishDraftPublication(tx, input.draft, tab.id);
          return { tab, replayed: false };
        },
      );
      if (replayed) return tab;

      // immediately revalidate the tab's url to improve end user experience
      // using "await" since a user immediately clicking the "View tab" button
      // would show them a stale page
      await ctx.res
        .revalidate(`/tab/${tab.id}/${encodeURIComponent(tab.title)}`)
        .catch((e) => {
          console.error("Error revalidating tab page:", e);
        });

      // Trigger screenshot capture in background (runs after response is sent)
      ctx.waitUntil(
        triggerScreenshotCapture(tab.id, tab.title).catch((e) =>
          console.error("Screenshot capture error:", e),
        ),
      );

      return tab;
    }),

  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: idToDelete, ctx }) => {
      const userId = ctx.auth.userId;

      const deleted = await serializableTransaction(ctx.prisma, async (tx) => {
        const tab = await tx.tab.findFirst({
          where: { id: idToDelete, createdByUserId: userId },
          select: { artistId: true, title: true },
        });
        if (!tab) return false;
        await tx.user.updateMany({
          where: { pinnedTabId: idToDelete },
          data: { pinnedTabId: null },
        });
        await tx.tab.delete({ where: { id: idToDelete } });
        await refreshUserStatistics(tx, [userId]);
        if (tab.artistId !== null)
          await refreshArtistStatistics(tx, [tab.artistId]);
        return tab;
      });
      if (!deleted) return null;

      const s3 = new S3Client({
        region: "us-east-2",
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const command = new DeleteObjectCommand({
        Bucket: `autostrum-screenshots${env.NODE_ENV === "development" ? "-dev" : ""}`,
        Key: `${idToDelete}.jpeg`,
      });

      try {
        await s3.send(command);
      } catch (e) {
        console.error(e);
        // return null;
      }

      await ctx.res
        .revalidate(`/tab/${idToDelete}/${encodeURIComponent(deleted.title)}`)
        .catch((error: unknown) => {
          console.error("Error revalidating deleted tab:", error);
        });
    }),
});
