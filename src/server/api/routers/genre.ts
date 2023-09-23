import type { Genre } from "@prisma/client";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export interface GenreWithTotalTabNumbers extends Genre {
  totalTabs: number;
}

export const genreRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.genre.findMany();
  }),

  getAllWithTotalTabNumbers: publicProcedure.query(async ({ ctx }) => {
    const genres = await ctx.prisma.genre.findMany({
      include: {
        _count: {
          select: {
            tabs: true,
          },
        },
      },
    });

    const genresWithTotalTabNumbers: GenreWithTotalTabNumbers[] = genres.map(
      (genre) => ({
        ...genre,
        totalTabs: genre._count.tabs,
      })
    );

    return genresWithTotalTabNumbers;
  }),
});
