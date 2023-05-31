import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const tabRouter = createTRPCRouter({
  // hello: publicProcedure
  //   .input(z.object({ text: z.string() }))
  //   .query(({ input }) => {
  //     return {
  //       greeting: `Hello ${input.text}`,
  //     };
  //   }),

  // technically should be private, but don't have to worry about auth yet
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.genre.findMany();
  }),
});
