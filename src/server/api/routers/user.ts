import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import type { User } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export interface UserMetadata extends User {
  bookmarkCount: number;
  numberOfTabs: number;
  bookmarkedTabIds: number[];
}

export const userRouter = createTRPCRouter({
  isUserRegistered: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: userId }) => {
      const user = await ctx.prisma.user.findFirst({
        where: {
          userId,
        },
        select: {
          userId: true, // prisma throws runtime error if select is empty
        },
      });

      return Boolean(user);
    }),

  update: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        username: z.string().optional(),
        profileImageUrl: z.string().optional(),
        pinnedTabId: z.number().optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      const { userId, username, profileImageUrl, pinnedTabId } = input;

      return ctx.prisma.user.update({
        where: {
          userId,
        },
        data: {
          username,
          profileImageUrl,
          pinnedTabId,
        },
      });
    }),

  getByIdOrUsername: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        username: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const whereClause = input.userId
        ? { userId: input.userId }
        : { username: input.username };

      const user = await ctx.prisma.user.findUnique({
        where: whereClause,
        include: {
          bookmarks: {
            select: {
              tabId: true,
            },
          },
          _count: {
            select: {
              tabs: true,
              bookmarksReceived: {
                where: {
                  tabCreatorUserId: {
                    equals: input.userId ?? input.username, // TODO: I think this is fundamentally wrong
                  },
                },
              },
            },
          },
        },
      });

      if (!user) return null;

      const userMetadata: UserMetadata = {
        ...user,
        numberOfTabs: user._count.tabs,
        bookmarkCount: user._count.bookmarksReceived,
        bookmarkedTabIds:
          user.bookmarks?.map((bookmark) => bookmark.tabId) ?? [],
      };

      return userMetadata;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        deleteAllOfArtistsTabs: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(input.userId);

      if (!input.deleteAllOfArtistsTabs) {
        // keeping the tabs, just removing the artist from them
        await ctx.prisma.tab.updateMany({
          where: {
            createdByUserId: input.userId,
          },
          data: {
            createdByUserId: null,
          },
        });
      }

      await ctx.prisma.user.delete({
        where: {
          userId: input.userId,
        },
      });
    }),
});
