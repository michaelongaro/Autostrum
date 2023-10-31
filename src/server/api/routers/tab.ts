import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Tab } from "@prisma/client";
import { z } from "zod";

const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import buildTabOrderBy from "~/utils/buildTabOrderBy";
import combineTabTitlesAndUsernames from "~/utils/combineTabTitlesAndUsernames";

export interface MinimalTabRepresentation {
  id: number;
  title: string;
  genreId: number;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  numberOfLikes: number;
}
export interface TabWithLikes extends Tab {
  numberOfLikes: number;
  // numberOfComments: number;
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
  getTabById: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
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

  getMinimalTabById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const tab = await ctx.prisma.tab.findUnique({
        where: {
          id: input.id,
        },
        select: {
          id: true,
          title: true,
          genreId: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          _count: {
            select: {
              likes: true,
            },
          },
        },
      });

      if (!tab) return null;

      const tabWithLikes: MinimalTabRepresentation = {
        ...tab,
        numberOfLikes: tab._count.likes,
      };

      return tabWithLikes;
    }),

  getTabByIdMutateVariation: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
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
        userIdToSelectFrom: z.string().optional(),
        likedByUserId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { query, includeUsernames, userIdToSelectFrom, likedByUserId } =
        input;

      const tabTitlesAndGenreIds = await ctx.prisma.tab.findMany({
        where: {
          title: {
            contains: query,
            mode: "insensitive",
          },
          createdById: userIdToSelectFrom,
          likes: {
            every: {
              artistWhoLikedId: likedByUserId,
            },
          },
        },
        select: {
          title: true,
          genreId: true,
        },
        distinct: ["title"],
        orderBy: {
          _relevance: {
            fields: ["title"],
            search: query.replace(/[\s\n\t]/g, "_"),
            sort: "asc",
          },
        },
      });

      let artists: { username: string }[] = [];
      if (includeUsernames) {
        artists = await ctx.prisma.artist.findMany({
          where: {
            username: {
              contains: query,
              mode: "insensitive",
            },
          },
          select: {
            username: true,
          },
          orderBy: {
            _relevance: {
              fields: ["username"],
              search: query.replace(/ /g, ""), // usernames aren't allowed to have spaces
              sort: "asc",
            },
          },
        });
      }

      return combineTabTitlesAndUsernames({
        tabs: tabTitlesAndGenreIds,
        usernames: artists.map((artist) => artist.username),
      });
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

      const limit = 15;

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
            ...(likedByUserId !== undefined
              ? {
                  likes: {
                    some: {
                      artistWhoLikedId: likedByUserId,
                    },
                  },
                }
              : {}),
          },
        }),
        ctx.prisma.tab.findMany({
          take: limit + 1, // get an extra item at the end which we'll use as next cursor
          distinct: ["id"],
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
            ...(likedByUserId !== undefined
              ? {
                  likes: {
                    some: {
                      artistWhoLikedId: likedByUserId,
                    },
                  },
                }
              : {}),
          },
          // gets bare minimum data to display in search results
          select: {
            id: true,
            title: true,
            genreId: true,
            createdAt: true,
            updatedAt: true,
            createdById: true,
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

      const tabsWithLikes: MinimalTabRepresentation[] = [];

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

  deleteTabById: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: idToDelete, ctx }) => {
      const tab = await ctx.prisma.tab.findUnique({
        where: {
          id: idToDelete,
        },
      });

      const command = new DeleteObjectCommand({
        Bucket: "autostrum-screenshots",
        Key: `${idToDelete}.webm`,
      });
      await getSignedUrl(s3, command, { expiresIn: 15 * 60 }); // expires in 15 minutes

      try {
        const res = await s3.send(command);
        console.log(res);
      } catch (e) {
        console.log(e);
        // return null;
      }

      if (tab?.hasRecordedAudio) {
        const command = new DeleteObjectCommand({
          Bucket: "autostrum-recordings",
          Key: `${idToDelete}.webm`,
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

      // if this tab is the artist's pinned tab, then set the artist's pinnedTabId to -1 (default value)
      if (tab && tab.createdById) {
        const artist = await ctx.prisma.artist.findUnique({
          where: {
            userId: tab.createdById,
          },
        });

        if (artist?.pinnedTabId === idToDelete) {
          await ctx.prisma.artist.update({
            where: {
              id: artist.id,
            },
            data: {
              pinnedTabId: -1,
            },
          });
        }
      }

      await ctx.prisma.tab.delete({
        where: {
          id: idToDelete,
        },
      });
    }),

  createOrUpdate: protectedProcedure
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
        chords: z.array(chordSchema),
        hasRecordedAudio: z.boolean(),
        strummingPatterns: z.array(strummingPatternSchema),
        tabData: z.array(sectionSchema),
        sectionProgression: z.array(sectionProgressionSchema),
        base64RecordedAudioFile: z.string().nullable(),
        shouldUpdateInS3: z.boolean(),
        musicalKey: z.string().nullable(),
        base64TabScreenshot: z.string(),
        type: z.enum(["create", "update"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // can we destructure input into it's fields here or does prisma not like that?

      const base64Data = input.base64TabScreenshot.split(",")[1]!;
      const imageBuffer = Buffer.from(base64Data, "base64");

      if (input.type === "create") {
        const tab = await ctx.prisma.tab.create({
          data: {
            createdById: input.createdById,
            title: input.title,
            description: input.description,
            genreId: input.genreId,
            tuning: input.tuning,
            sectionProgression: input.sectionProgression,
            hasRecordedAudio: input.hasRecordedAudio,
            bpm: input.bpm,
            timeSignature: input.timeSignature,
            capo: input.capo,
            chords: input.chords,
            strummingPatterns: input.strummingPatterns,
            tabData: input.tabData,
          },
        });

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

        if (input.shouldUpdateInS3 && input.base64RecordedAudioFile) {
          const buffer = Buffer.from(input.base64RecordedAudioFile, "base64");

          const command = new PutObjectCommand({
            Bucket: "autostrum-recordings",
            Key: `${tab.id}.webm`,
            Body: buffer,
            ContentType: "audio/webm;codecs=opus",
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
      } else if (input.type === "update" && input.id !== null) {
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

        if (input.shouldUpdateInS3) {
          if (input.base64RecordedAudioFile) {
            // replace current recording w/ new one in s3

            const buffer = Buffer.from(input.base64RecordedAudioFile, "base64");

            const command = new PutObjectCommand({
              Bucket: "autostrum-recordings",
              Key: `${input.id}.webm`,
              ContentType: "audio/webm",
              Body: buffer,
            });
            await getSignedUrl(s3, command, { expiresIn: 15 * 60 }); // expires in 15 minutes

            try {
              const res = await s3.send(command);
              console.log(res);
            } catch (e) {
              console.log(e);
              // return null;
            }
          } else {
            // delete current recording from s3

            const command = new DeleteObjectCommand({
              Bucket: "autostrum-recordings",
              Key: `${input.id}.webm`,
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
        }

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
            hasRecordedAudio: input.hasRecordedAudio,
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
