import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  getUserById: publicProcedure.input(z.string()).query(async ({ input }) => {
    const [user] = await clerkClient.users.getUserList({
      userId: [input],
    });
    return user;
  }),
});
