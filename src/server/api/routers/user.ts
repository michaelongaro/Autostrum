import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  getUserByIdOrUsername: publicProcedure
    .input(
      z.object({
        id: z.string().optional(),
        username: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // will need to get UserMetadata from prisma first and then add onto the user obj before returning
      let clerkUser;
      if (input.id) {
        const [user] = await clerkClient.users.getUserList({
          userId: [input.id],
        });

        clerkUser = user;
      } else if (input.username) {
        const [user] = await clerkClient.users.getUserList({
          username: [input.username],
        });

        clerkUser = user;
      }

      if (!clerkUser) return null;

      const userMetadata = await ctx.prisma.userMetadata.findUnique({
        where: {
          userId: clerkUser.id,
        },
      });

      if (!userMetadata) return clerkUser;

      return {
        ...clerkUser,
        publicMetadata: {
          likedTabIds: userMetadata.likedTabIds,
          totalLikesReceived: userMetadata.totalLikesReceived,
          totalTabsCreated: userMetadata.totalTabsCreated,
          pinnedTabId: userMetadata.pinnedTabId,
        },
      };
    }),
  // should be private
  modifyUserMetadata: publicProcedure
    // maybe want to expand a bit to include like "showTutorial" boolean for /create
    // or other things like that
    .input(
      z.object({
        userId: z.string(),
        pinnedTabId: z.number().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.userMetadata.update({
        where: {
          userId: input.userId,
        },
        data: {
          pinnedTabId: input.pinnedTabId,
        },
      });
    }),
  // should be private
  deleteUser: publicProcedure
    .input(z.string())
    .mutation(async ({ input: userId, ctx }) => {
      void clerkClient.users.deleteUser(userId);

      await ctx.prisma.userMetadata.delete({
        where: {
          userId,
        },
      });
    }),
});
