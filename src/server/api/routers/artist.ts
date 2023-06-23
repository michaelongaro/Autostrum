import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { Artist } from "@prisma/client";
import buildArtistOrderBy from "~/utils/buildArtistOrderBy";

export interface ArtistMetadata extends Artist {
  numberOfLikes: number;
  numberOfTabs: number;
  likedTabIds: number[];
}

export const artistRouter = createTRPCRouter({
  updateArtist: publicProcedure
    .input(
      z.object({
        id: z.string(),
        username: z.string().optional(),
        profileImageUrl: z.string().optional(),
        pinnedTabId: z.number().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      return ctx.prisma.artist.update({
        where: {
          userId: input.id,
        },
        data: {
          username: input.username,
          profileImageUrl: input.profileImageUrl,
          pinnedTabId: input.pinnedTabId,
        },
      });
    }),

  getByIdOrUsername: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        username: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const artist = await ctx.prisma.artist.findUnique({
        // look up better ways to do dynamic keys/conditions in prisma with es6 syntax
        // for more complex cases than just two: prob just do logic above and store where obj in variable
        // then below say "where: whereObj" and you should be good.
        where: {
          [input.userId ? "userId" : "username"]: input.userId
            ? input.userId
            : input.username,
        },
        include: {
          likesGiven: {
            select: {
              tabId: true,
            },
          },
          _count: {
            select: {
              tabs: true,
              likesReceived: {
                where: {
                  // would be a miracle if this works
                  [input.userId ? "tabArtistId" : "tabArtistUsername"]: {
                    equals: input.userId ? input.userId : input.username,
                  },
                },
              },
            },
          },
        },
      });

      if (!artist) return null;

      const artistMetadata: ArtistMetadata = {
        ...artist,
        numberOfTabs: artist._count.tabs,
        numberOfLikes: artist._count.likesReceived,
        likedTabIds: artist.likesGiven.map((like) => like.tabId),
      };

      return artistMetadata;
    }),

  // start here when picking up again:

  // primarily wanted to do this just to get same logic for infinite scroll as I "have" for tabs
  // but I want to copy over username + profilePicture url from clerk to prisma schema whenever
  // the username/picUrl changes, easiest way of doing this is to just have one hook: \
  // useKeepUserMetadataUpdated somewhere near root of app, and only have it update whenever
  // username/picUrl from {user} obj are different from what's in prisma!

  // this means you basically have exact same logic for tabs and users and can pretty much just take out
  // any references to the clerk backend api as far as I can tell.

  // ALSO ALSO ALSO be mightily prepared to straight up SCRAP your manual relevance sorting because
  // it looks like prisma + postgres might just be able to do it for you!  https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#sort-post-by-relevance-of-the-title

  // okay legit play around with this because you could just be saving yourself so much time, but:
  //   const users = await prisma.user.findMany({
  //   select: {
  //     email: true,
  //     role: true,
  //   },
  //   orderBy: [
  //     {
  //       role: 'desc',
  //     },
  //     {
  //       email: 'desc',
  //     },
  //   ],
  // })
  // it looks like the above block will first sorts by role, then by email, so you could do relevance first,
  // then by date/likes? Straight up I don't know what the exact difference would be by swapping sort order but
  // test it out or obv look it up/chatgpt! I still think it's fine to keep "manual" counting of likes/total artists tbh and I
  // don't really see that changing but keep an open mind throughout all of this while experimenting!

  // I feel like below is your best option to try first:
  // const posts = await prisma.post.findMany({
  //   orderBy: {
  //     _relevance: {
  //       fields: ['title'],
  //       search: 'database',
  //       sort: 'asc' // maybe useful to keep not sure yet
  //     },
  //     createdAt: 'desc', // to then sort relevant results by date afterwards
  // })

  getInfiniteArtistsBySearchQuery: publicProcedure
    .input(
      z.object({
        searchQuery: z.string(),
        sortByRelevance: z.boolean(),
        sortBy: z.enum(["newest", "oldest", "mostLiked", "leastLiked", "none"]),
        // limit: z.number(), fine to hardcode I think, maybe end up scaling down from 25 on smaller screens?
        cursor: z.number().nullish(), // <-- "cursor" needs to exist, but can be any type
      })
    )
    .query(async ({ input, ctx }) => {
      const { searchQuery, sortByRelevance, sortBy, cursor } = input;
      const limit = 25;

      const orderBy = buildArtistOrderBy(sortBy, sortByRelevance, searchQuery);

      const fullArtistListWithMetadata: ArtistMetadata[] = [];

      const [count, artistIds] = await Promise.all([
        ctx.prisma.artist.count({
          where: {
            username: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        }),
        ctx.prisma.artist.findMany({
          take: limit + 1, // get an extra item at the end which we'll use as next cursor
          where: {
            username: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            userId: true,
          },
          cursor: cursor ? { id: cursor } : undefined,
          ...(orderBy !== undefined ? { orderBy: orderBy } : {}),
        }),
      ]);

      let nextCursor: typeof cursor | undefined = undefined;
      if (artistIds.length > limit) {
        const nextItem = artistIds.pop();
        if (nextItem) {
          nextCursor = nextItem.id;
        }
      }

      for (const artist of artistIds) {
        const retrievedArtist = await ctx.prisma.artist.findUnique({
          where: {
            id: artist.id,
          },
          include: {
            likesGiven: {
              select: {
                tabId: true,
              },
            },
            _count: {
              select: {
                tabs: true,
                likesReceived: {
                  where: {
                    tabArtistId: {
                      equals: artist.userId,
                    },
                  },
                },
              },
            },
          },
        });

        if (retrievedArtist) {
          fullArtistListWithMetadata.push({
            ...retrievedArtist,
            numberOfTabs: retrievedArtist._count.tabs,
            numberOfLikes: retrievedArtist._count.likesReceived,
            likedTabIds: retrievedArtist.likesGiven.map((like) => like.tabId),
          });
        }
      }

      // sort by relevance if sortByRelevance is true and there is a search query
      // if (sortByRelevance && searchQuery) {
      //   artists = sortResultsByRelevance({
      //     query: searchQuery,
      //     artists: artists,
      //   }) as Tab[];
      // }

      // ideally find way to not have to add "as type" without just splitting
      // into different functions...

      return {
        data: {
          artists: fullArtistListWithMetadata,
          nextCursor,
        },
        count,
      };
    }),

  // should be private
  deleteArtist: publicProcedure
    .input(z.string())
    .mutation(async ({ input: userId, ctx }) => {
      void clerkClient.users.deleteUser(userId);

      await ctx.prisma.artist.delete({
        where: {
          userId,
        },
      });
    }),
});
