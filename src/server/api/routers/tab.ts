import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Tab } from "~/generated/client";
import { z } from "zod";
import { env } from "~/env";

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

const baseNoteLengths = z.union([
  z.literal("whole"),
  z.literal("half"),
  z.literal("quarter"),
  z.literal("eighth"),
  z.literal("sixteenth"),
]);

const fullNoteLengths = z.union([
  z.literal("whole"),
  z.literal("whole dotted"),
  z.literal("whole double-dotted"),
  z.literal("half"),
  z.literal("half dotted"),
  z.literal("half double-dotted"),
  z.literal("quarter"),
  z.literal("quarter dotted"),
  z.literal("quarter double-dotted"),
  z.literal("eighth"),
  z.literal("eighth dotted"),
  z.literal("eighth double-dotted"),
  z.literal("sixteenth"),
  z.literal("sixteenth dotted"),
  z.literal("sixteenth double-dotted"),
]);

// -----------------------------
// Section Progression
// -----------------------------
const sectionProgressionSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  title: z.string(),
  repetitions: z.number(),
  startSeconds: z.number(),
  endSeconds: z.number(),
});

// -----------------------------
// Chord
// -----------------------------
const chordSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  frets: z.array(z.string()), // keeping as string to match ITabSection
});

// -----------------------------
// Strum
// -----------------------------
const strumSchema = z.object({
  palmMute: z.union([
    z.literal(""),
    z.literal("-"),
    z.literal("start"),
    z.literal("end"),
  ]),
  strum: z.string(), // effects are v, ^, >, s, ., r
  noteLength: fullNoteLengths,
  noteLengthModified: z.boolean(),
});

// -----------------------------
// Strumming Pattern
// -----------------------------
const strummingPatternSchema = z.object({
  id: z.string(),
  baseNoteLength: baseNoteLengths,
  strums: z.array(strumSchema),
});

// -----------------------------
// Chord Sequence
// -----------------------------
const chordSequenceSchema = z.object({
  id: z.string(),
  strummingPattern: strummingPatternSchema,
  bpm: z.number(),
  repetitions: z.number(),
  data: z.array(z.string()), // array of chord names
});

// -----------------------------
// Chord Section
// -----------------------------
const chordSectionSchema = z.object({
  id: z.string(),
  type: z.literal("chord"),
  bpm: z.number(),
  repetitions: z.number(),
  data: z.array(chordSequenceSchema),
});

// -----------------------------
// Tab Note
// -----------------------------
const tabNoteSchema = z.object({
  type: z.literal("note"),
  palmMute: z.union([
    z.literal(""),
    z.literal("-"),
    z.literal("start"),
    z.literal("end"),
  ]),
  firstString: z.string(), // low E
  secondString: z.string(), // A
  thirdString: z.string(), // D
  fourthString: z.string(), // G
  fifthString: z.string(), // B
  sixthString: z.string(), // high E
  chordEffects: z.string(),
  noteLength: fullNoteLengths,
  noteLengthModified: z.boolean(),
  id: z.string(),
});

// -----------------------------
// Tab Measure Line
// -----------------------------
const tabMeasureLineSchema = z.object({
  type: z.literal("measureLine"),
  isInPalmMuteSection: z.boolean(),
  bpmAfterLine: z.number().nullable(),
  id: z.string(),
});

// -----------------------------
// Tab Section
// -----------------------------
const tabSectionSchema = z.object({
  id: z.string(),
  type: z.literal("tab"),
  bpm: z.number(),
  baseNoteLength: baseNoteLengths,
  repetitions: z.number(),
  data: z.array(
    z.discriminatedUnion("type", [tabNoteSchema, tabMeasureLineSchema]),
  ),
});

// -----------------------------
// Section
// -----------------------------
const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  data: z.array(z.union([tabSectionSchema, chordSectionSchema])),
});

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
      const error = await response.json();
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

      // make sure that the userIpAddress + tabId combo is not already in the DailyTabView model for this tab
      const existingView = await ctx.prisma.dailyTabView.findUnique({
        where: {
          userIpAddress_tabId: {
            tabId,
            userIpAddress: ipAddress,
          },
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

      // immediately revalidate the tab's page improve end user experience
      ctx.res
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

      // increment the tabCreator's number of tabs
      ctx.prisma.user
        .update({
          where: {
            userId,
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

      // if artistId was passed in, increment the artist's number of tabs
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
      const prevTabVersion = await ctx.prisma.tab.findUnique({
        where: {
          id,
        },
        select: {
          artistId: true,
          pageViews: true, // used to update the artist's totalViews
          createdByUserId: true,
        },
      });

      // only the tab creator can update their tab
      if (
        !prevTabVersion ||
        prevTabVersion.createdByUserId !== ctx.auth.userId
      ) {
        throw new Error("Unable to find tab or unauthorized");
      }

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
      });

      // immediately revalidate the tab's page to improve end user experience
      ctx.res
        .revalidate(`/tab/${tab.id}/${encodeURIComponent(tab.title)}`)
        .catch((e) => {
          console.error("Error revalidating tab page:", e);
        });

      console.log(
        "just about to trigger screenshot capture for updated tab:",
        tab.id,
      );

      // Trigger screenshot capture in background (runs after response is sent)
      ctx.waitUntil(
        triggerScreenshotCapture(tab.id, tab.title).catch((e) =>
          console.error("Screenshot capture error:", e),
        ),
      );

      // check if the artistId has changed
      if (prevTabVersion.artistId !== artistId) {
        // decrement the prev artist's totalTabs and totalViews
        if (prevTabVersion.artistId) {
          ctx.prisma.artist
            .update({
              where: {
                id: prevTabVersion.artistId,
              },
              data: {
                totalTabs: {
                  decrement: 1,
                },
                totalViews: {
                  decrement: prevTabVersion.pageViews,
                },
              },
            })
            .catch((e) => {
              console.error("Error decrementing prev artist's totalTabs:", e);
            });
        }
        // increment the new artist's totalTabs and totalViews
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
                totalViews: {
                  increment: prevTabVersion.pageViews,
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
      const userId = ctx.auth.userId;

      const tab = await ctx.prisma.tab.findUnique({
        where: {
          id: idToDelete,
        },
      });

      // only the tab creator can delete their tab
      if (!tab || tab.createdByUserId !== userId) return null;

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
