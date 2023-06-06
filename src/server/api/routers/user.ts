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
    .query(async ({ input }) => {
      if (input.id) {
        const [user] = await clerkClient.users.getUserList({
          userId: [input.id],
        });
        return user;
      } else if (input.username) {
        const [user] = await clerkClient.users.getUserList({
          username: [input.username],
        });
        return user;
      }
    }),
  // should be private
  modifyUserMetadata: publicProcedure
    // maybe want to expand a bit to include like "showTutorial" boolean for /create
    // or other things like that
    .input(
      z.object({
        userId: z.string(),
        pinnedTabId: z.string().nullable(),
      })
    )
    .mutation(({ input }) => {
      void clerkClient.users.updateUserMetadata(input.userId, {
        publicMetadata: {
          pinnedTabId: input.pinnedTabId,
        },
      });
    }),
  // should be private
  deleteUser: publicProcedure
    .input(z.string())
    .mutation(({ input: userId }) => {
      void clerkClient.users.deleteUser(userId);
    }),
});
