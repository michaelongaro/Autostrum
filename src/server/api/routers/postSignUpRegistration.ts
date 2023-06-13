import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const postSignUpRegistrationRouter = createTRPCRouter({
  // doesn't feel fantastic putting this in it's own file, not sure of another
  // organized option though...

  initializeNewUser: publicProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.userMetadata
        .create({
          data: {
            userId: input,
          },
        })
        .catch((err) => {
          console.log(err);
          return false;
        });

      return true;
    }),
});
