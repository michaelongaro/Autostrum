import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const genreRouter = createTRPCRouter({
  getAllWithTotalTabCount: publicProcedure.query(async ({ ctx }) => {
    const genreCounts = await ctx.prisma.tab.groupBy({
      by: ["genre"],
      _count: {
        _all: true,
      },
    });

    const genreMap = new Map<string, number>();

    for (const group of genreCounts) {
      genreMap.set(group.genre, group._count._all);
    }

    return genreMap;
  }),
});
