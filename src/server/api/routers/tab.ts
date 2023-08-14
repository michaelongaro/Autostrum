import type { Tab } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import buildTabOrderBy from "~/utils/buildTabOrderBy";
import combineTabTitlesAndUsernames from "~/utils/combineTabTitlesAndUsernames";

export interface TabWithLikes extends Tab {
  numberOfLikes: number;
  // numberOfComments: number;
}

// experimentally testing this zod schema from a typescript types -> zod converter online
export const strumSchema = z.object({
  palmMute: z.union([
    z.literal(""),
    z.literal("-"),
    z.literal("start"),
    z.literal("end"),
  ]),
  strum: z.union([
    z.literal(""),
    z.literal("v"),
    z.literal("^"),
    z.literal("s"),
    z.literal("v>"),
    z.literal("^>"),
    z.literal("s>"),
  ]),
});

export const tabSectionSchema = z.object({
  type: z.literal("tab"),
  bpm: z.number(),
  repetitions: z.number(),
  data: z.array(z.array(z.string())),
});

export const strummingPatternSchema = z.object({
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

export const chordSequenceSchema = z.object({
  strummingPattern: strummingPatternSchema,
  bpm: z.number(),
  repetitions: z.number(),
  data: z.array(z.string()),
});

export const chordSectionSchema = z.object({
  type: z.literal("chord"),
  repetitions: z.number(),
  data: z.array(chordSequenceSchema),
});

export const sectionSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    data: z.array(z.union([tabSectionSchema, chordSectionSchema])),
  })
);

export const tabRouter = createTRPCRouter({
  getTabById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const tab = await ctx.prisma.tab.findUnique({
        where: {
          id: input.id,
        },
        include: {
          _count: {
            select: {
              likes: true,
            },
          },
        },
      });

      if (!tab) return null;

      const tabWithLikes: TabWithLikes = {
        ...tab,
        numberOfLikes: tab._count.likes,
      };

      return tabWithLikes;
    }),

  getTabTitlesAndUsernamesBySearchQuery: publicProcedure
    .input(
      z.object({
        query: z.string(),
        includeUsernames: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tabTitles = await ctx.prisma.tab.findMany({
        where: {
          title: {
            contains: input.query,
            mode: "insensitive",
          },
        },
        select: {
          title: true,
        },
        distinct: ["title"],
        orderBy: {
          _relevance: {
            fields: ["title"],
            search: input.query,
            sort: "asc",
          },
        },
      });

      let artists: { username: string }[] = [];
      if (input.includeUsernames) {
        artists = await ctx.prisma.artist.findMany({
          where: {
            username: {
              contains: input.query,
              mode: "insensitive",
            },
          },
          select: {
            username: true,
          },
          orderBy: {
            _relevance: {
              fields: ["username"],
              search: input.query,
              sort: "asc",
            },
          },
        });
      }

      return combineTabTitlesAndUsernames(
        tabTitles.map((tab) => tab.title),
        artists.map((artist) => artist.username)
      );
    }),

  getInfiniteTabsBySearchQuery: publicProcedure
    .input(
      z.object({
        searchQuery: z.string(),
        genreId: z.number(),
        sortByRelevance: z.boolean(),
        sortBy: z.enum(["newest", "oldest", "mostLiked", "leastLiked", "none"]),
        userIdToSelectFrom: z.string().optional(),
        likedByUserId: z.string().optional(),
        // limit: z.number(), fine to hardcode I think, maybe end up scaling down from 25 on smaller screens?
        cursor: z.number().nullish(), // <-- "cursor" needs to exist, but can be any type
      })
    )
    .query(async ({ input, ctx }) => {
      const {
        searchQuery,
        genreId,
        sortByRelevance,
        sortBy,
        userIdToSelectFrom,
        likedByUserId,
        cursor,
      } = input;
      const limit = 25;

      const orderBy = buildTabOrderBy(sortBy, sortByRelevance, searchQuery);

      const [count, tabs] = await Promise.all([
        ctx.prisma.tab.count({
          where: {
            title: {
              contains: searchQuery,
              mode: "insensitive",
            },
            genreId:
              genreId === 9
                ? {
                    lt: genreId,
                  }
                : {
                    equals: genreId,
                  },
            createdById: userIdToSelectFrom,
            likes: {
              every: {
                artistWhoLikedId: likedByUserId,
              },
            },
          },
        }),
        ctx.prisma.tab.findMany({
          take: limit + 1, // get an extra item at the end which we'll use as next cursor
          where: {
            title: {
              contains: searchQuery,
              mode: "insensitive",
            },
            genreId:
              genreId === 9
                ? {
                    lt: genreId,
                  }
                : {
                    equals: genreId,
                  },
            createdById: userIdToSelectFrom,
            likes: {
              every: {
                artistWhoLikedId: likedByUserId,
              },
            },
          },
          include: {
            _count: {
              select: {
                likes: true,
              },
            },
          },
          ...(orderBy !== undefined ? { orderBy: orderBy } : {}),
          cursor: cursor ? { id: cursor } : undefined,
        }),
      ]);

      let nextCursor: typeof cursor | undefined = undefined;
      if (tabs.length > limit) {
        const nextItem = tabs.pop();
        if (nextItem) {
          nextCursor = nextItem.id;
        }
      }

      const tabsWithLikes: TabWithLikes[] = [];

      for (const tab of tabs) {
        tabsWithLikes.push({
          ...tab,
          numberOfLikes: tab._count.likes,
        });
      }

      return {
        data: {
          tabs: tabsWithLikes,
          nextCursor,
        },
        count,
      };
    }),

  // technically should be private, but don't have to worry about auth yet
  createOrUpdate: publicProcedure
    .input(
      z.object({
        id: z.number().nullable(),
        createdById: z.string(),
        title: z.string(),
        description: z.string(),
        genreId: z.number(),
        tuning: z.string(),
        bpm: z.number(),
        timeSignature: z.string(),
        capo: z.number(),
        chords: z.array(
          z.object({
            name: z.string(),
            frets: z.array(z.string()),
          })
        ),
        strummingPatterns: z.array(
          z.object({
            noteLength: z.string(),
            strums: z.array(
              z.object({
                palmMute: z.string(),
                strum: z.string(),
              })
            ),
          })
        ),
        tabData: sectionSchema,
        sectionProgression: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            repetitions: z.number(),
          })
        ),
        type: z.enum(["create", "update"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.type === "create") {
        const tab = await ctx.prisma.tab.create({
          data: {
            createdById: input.createdById,
            title: input.title,
            description: input.description,
            genreId: input.genreId,
            tuning: input.tuning,
            sectionProgression: input.sectionProgression,
            bpm: input.bpm,
            timeSignature: input.timeSignature,
            capo: input.capo,
            chords: input.chords,
            strummingPatterns: input.strummingPatterns,
            tabData: input.tabData,
          },
        });

        return tab;
      } else if (input.type === "update" && input.id !== null) {
        return ctx.prisma.tab.update({
          where: {
            id: input.id,
          },
          data: {
            title: input.title,
            description: input.description,
            genreId: input.genreId,
            tuning: input.tuning,
            sectionProgression: input.sectionProgression,
            bpm: input.bpm,
            timeSignature: input.timeSignature,
            capo: input.capo,
            chords: input.chords,
            strummingPatterns: input.strummingPatterns,
            tabData: input.tabData,
          },
        });
      }
    }),
});
