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
});
