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
    .mutation(({ input, ctx }) => {
      if (input.type === "create") {
        return ctx.prisma.tab.create({
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
