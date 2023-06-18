import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { Artist } from "@prisma/client";

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
  // test it out or obv look it up/chatgpt! I still think it's fine to keep "manual" counting of likes/total tabs tbh and I
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
        searchQuery: z.string().optional(),
        genreId: z.number(),
        sortByRelevance: z.boolean(),
        sortBy: z
          .enum(["newest", "oldest", "mostLiked", "leastLiked"])
          .optional(),
        userIdToSelectFrom: z.string().optional(),
        // limit: z.number(), fine to hardcode I think, maybe end up scaling down from 25 on smaller screens?
        cursor: z.number().nullish(), // <-- "cursor" needs to exist, but can be any type
      })
    )
    .query(async ({ input, ctx }) => {
      const { searchQuery, genreId, sortByRelevance, sortBy, cursor } = input;
      const limit = 25;

      let orderBy:
        | {
            createdAt?: "asc" | "desc";
            numberOfLikes?: "asc" | "desc";
          }
        | undefined = undefined;

      if (sortBy) {
        if (sortBy === "newest") {
          orderBy = {
            createdAt: "desc",
          };
        } else if (sortBy === "oldest") {
          orderBy = {
            createdAt: "asc",
          };
        } else if (sortBy === "mostLiked") {
          orderBy = {
            numberOfLikes: "desc",
          };
        } else if (sortBy === "leastLiked") {
          orderBy = {
            numberOfLikes: "asc",
          };
        }
      }

      let tabs = await ctx.prisma.tab.findMany({
        take: limit + 1, // get an extra item at the end which we'll use as next cursor
        where: {
          title: {
            contains: searchQuery, // ideally use fulltext search from postgres, but not sure how to set it up where you get both ddirections of "contains"
            mode: "insensitive",
          },
          // not sure if this is best way, basically I would like to get all tabs if genreId is 9 (all genres)
          genreId:
            genreId === 9
              ? {
                  lt: genreId,
                }
              : {
                  equals: genreId,
                },
        },

        // https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination

        //                 hoping that replacing "myCursor" with id is the logical replacement to make
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: orderBy,
      });
      let nextCursor: typeof cursor | undefined = undefined;
      if (tabs.length > limit) {
        const nextItem = tabs.pop();
        if (nextItem) {
          nextCursor = nextItem.id;
        }
      }

      // sort by relevance if sortByRelevance is true and there is a search query
      if (sortByRelevance && searchQuery) {
        tabs = sortResultsByRelevance({
          query: searchQuery,
          tabs: tabs,
        }) as Tab[];
      }

      // ideally find way to not have to add "as type" without just splitting
      // into different functions...

      return {
        tabs,
        nextCursor,
      };
    }),

  // should be private
  deleteUser: publicProcedure
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
