import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import combineTabTitlesAndUsernames from "~/utils/combineTabTitlesAndUsernames";

export const tabRouter = createTRPCRouter({
  getTabById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input, ctx }) => {
      return ctx.prisma.tab.findUnique({
        where: {
          id: input.id,
        },
      });
    }),

  // almost definitely will have to be changed for infinite scroll implementation
  getTabTitlesAndUsernamesBySearchQuery: publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      if (input === "") return null;

      const tabs = await ctx.prisma.tab.findMany({
        where: {
          title: {
            contains: input,
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

      if (tabs.length === 0 && users.length === 0) return null;

      // then once you have titles + usernames, we get direct matches first (start of string)
      // and put those in front of the other values (the ones that just match *somewhere* in the string)

      // getting rid of duplicate tab titles
      const uniqueTabTitles = [...new Set(tabs.map((tab) => tab.title))];

      const directTabTitleMatches = uniqueTabTitles
        .filter((tab) => tab.startsWith(input))
        .sort((a, b) => a.length - b.length);

      // create a new array with the direct matches first, then the rest of the matches
      const sortedTabTitles = [
        ...directTabTitleMatches,
        ...uniqueTabTitles.filter((tab) => !tab.startsWith(input)),
      ];

      const usernames = users.map((user) => user.username!); // usernames are mandatory in our clerk config

      const directUsernameMatches = usernames
        .filter((username) => username.startsWith(input))
        .sort((a, b) => a.length - b.length);

      // create a new array with the direct matches first, then the rest of the matches
      const sortedUsernames = [
        ...directUsernameMatches,
        ...usernames.filter(
          (username) => !username.startsWith(input) && username.includes(input)
        ),
      ];

      return combineTabTitlesAndUsernames(sortedTabTitles, sortedUsernames);
    }),

  toggleTabLikeStatus: publicProcedure
    .input(
      z.object({
        tabId: z.number(),
        tabOwnerId: z.string(),
        userId: z.string(),
        likeTab: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.tab.update({
        where: {
          id: input.tabId,
        },
        data: {
          numberOfLikes: {
            [input.likeTab ? "increment" : "decrement"]: 1,
          },
        },
      });

      // update tab owner total likes

      await ctx.prisma.userMetadata.update({
        where: {
          userId: input.tabOwnerId,
        },
        data: {
          totalLikesReceived: {
            [input.likeTab ? "increment" : "decrement"]: 1,
          },
        },
      });

      // update user's list of liked tabIds

      // need to fetch user's current likedTabIds first if we are unliking a tab
      // since prisma doesn't support removing an item from an array (yet)

      const userMetadata = await ctx.prisma.userMetadata.findUnique({
        where: {
          userId: input.userId,
        },
        select: {
          likedTabIds: true,
        },
      });

      const likedTabIds = userMetadata?.likedTabIds;
      let updatedLikedTabIds;

      if (likedTabIds) {
        if (input.likeTab) {
          updatedLikedTabIds = [...likedTabIds, input.tabId];
        } else {
          updatedLikedTabIds = likedTabIds.filter(
            (id: number) => id !== input.tabId
          );
        }
      }

      await ctx.prisma.userMetadata.update({
        where: {
          userId: input.userId,
        },
        data: {
          likedTabIds: updatedLikedTabIds,
        },
      });

      return input.likeTab;
    }),

  getTabsBySearch: publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      if (input === "") return null;

      const tabs = await ctx.prisma.tab.findMany({
        where: {
          title: {
            contains: input,
          },
        },
      });

      return tabs;
    }),

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
            numberOfLikes: 0,
          },
        });

        // update user's total tabs created
        await ctx.prisma.userMetadata.update({
          where: {
            userId: input.createdById,
          },
          data: {
            totalTabsCreated: {
              increment: 1,
            },
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
            tabData: input.tabData,
          },
        });
      }
    }),
});
