import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { feedbackInputSchema } from "~/utils/feedback";

export const feedbackRouter = createTRPCRouter({
  create: publicProcedure
    .input(feedbackInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.feedback.create({ data: input, select: { id: true } });
      return { success: true };
    }),
});
