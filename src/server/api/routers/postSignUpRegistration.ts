import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const postSignUpRegistrationRouter = createTRPCRouter({
  // doesn't feel fantastic putting this in it's own file, not sure of another
  // organized option though...

  initializeNewUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        username: z.string(),
        profileImageUrl: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.artist
        .create({
          data: {
            userId: input.userId,
            username: input.username,
            profileImageUrl: input.profileImageUrl,
          },
        })
        .catch((err) => {
          console.log(err);
          return false;
        });

      return true;
    }),
});
