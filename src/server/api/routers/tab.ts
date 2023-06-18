import { clerkClient } from "@clerk/nextjs/server";
import type { Tab } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import combineTabTitlesAndUsernames from "~/utils/combineTabTitlesAndUsernames";
import { sortResultsByRelevance } from "~/utils/sortResultsByRelevance";

export interface TabWithLikes extends Tab {
  numberOfLikes: number;
  // numberOfComments: number;
}

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

      console.log("tab has", tabWithLikes.numberOfLikes, "likes");

      return tabWithLikes;
    }),

  // almost definitely will have to be changed for infinite scroll implementation
  getTabTitlesAndUsernamesBySearchQuery: publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      if (input === "") return null;

      const tabTitles = await ctx.prisma.tab.findMany({
        where: {
          title: {
            contains: input, // ideally use fulltext search from postgres, but not sure how to set it up where you get both ddirections of "contains"
            mode: "insensitive",
          },
        },
        select: {
          title: true,
        },

        orderBy: {
          // this part below should be calculated above based on props and put into state to plug in below
          title: "asc",
        },
      });

      // need to get all users since filtering by username only supports exact full
      // matches, not partial matches.
      const users = await clerkClient.users.getUserList();

      if (tabTitles.length === 0 && users.length === 0) return null;

      const sortedTabTitles = sortResultsByRelevance({
        query: input,
        tabTitles: tabTitles.map((tab) => tab.title),
      });

      const sortedUsernames = sortResultsByRelevance({
        query: input,
        usernames: users.map((user) => user.username!),
      });

      return combineTabTitlesAndUsernames(
        sortedTabTitles as string[],
        sortedUsernames as string[]
      );
    }),

  getInfiniteTabsBySearchQuery: publicProcedure
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

  // toggleTabLikeStatus: publicProcedure
  //   .input(
  //     z.object({
  //       tabId: z.number(),
  //       tabOwnerId: z.string(),
  //       userId: z.string(),
  //       likingTab: z.boolean(),
  //     })
  //   )
  //   .mutation(async ({ input, ctx }) => {
  //     await ctx.prisma.tab.update({
  //       where: {
  //         id: input.tabId,
  //       },
  //       data: {
  //         numberOfLikes: {
  //           [input.likingTab ? "increment" : "decrement"]: 1,
  //         },
  //       },
  //     });

  //     // update tab owner total likes

  //     await ctx.prisma.userMetadata.update({
  //       where: {
  //         userId: input.tabOwnerId,
  //       },
  //       data: {
  //         totalLikesReceived: {
  //           [input.likingTab ? "increment" : "decrement"]: 1,
  //         },
  //       },
  //     });

  //     // update user's list of liked tabIds

  //     // need to fetch user's current likedTabIds first if we are unliking a tab
  //     // since prisma doesn't support removing an item from an array (yet)

  //     const userMetadata = await ctx.prisma.userMetadata.findUnique({
  //       where: {
  //         userId: input.userId,
  //       },
  //       select: {
  //         likedTabIds: true,
  //       },
  //     });

  //     const likedTabIds = userMetadata?.likedTabIds;
  //     let updatedLikedTabIds;

  //     if (likedTabIds) {
  //       if (input.likingTab) {
  //         updatedLikedTabIds = [...likedTabIds, input.tabId];
  //       } else {
  //         updatedLikedTabIds = likedTabIds.filter(
  //           (id: number) => id !== input.tabId
  //         );
  //       }
  //     }

  //     await ctx.prisma.userMetadata.update({
  //       where: {
  //         userId: input.userId,
  //       },
  //       data: {
  //         likedTabIds: updatedLikedTabIds,
  //       },
  //     });

  //     return input.likingTab;
  //   }),

  // technically should be private, but don't have to worry about auth yet
  createOrUpdate: publicProcedure
    .input(
      z.object({
        id: z.number().nullable(),
        createdById: z.string(),
        title: z.string(),
        description: z.string().nullable(),
        genreId: z.number(),
        tuning: z.string(),
        bpm: z.number(),
        timeSignature: z.string().nullable(),
        capo: z.number().nullable(),
        tabData: z.array(
          z.object({ title: z.string(), data: z.array(z.array(z.string())) })
        ),
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
            tabData: input.tabData,
          },
        });

        // update user's total tabs created
        // await ctx.prisma.userMetadata.update({
        //   where: {
        //     userId: input.createdById,
        //   },
        //   data: {
        //     totalTabsCreated: {
        //       increment: 1,
        //     },
        //   },
        // });

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
            tabData: input.tabData,
          },
        });
      }
    }),
});
