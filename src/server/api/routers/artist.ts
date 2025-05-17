import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const artistRouter = createTRPCRouter({
  getByNameAndOrId: publicProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { id, name } = input;

      let whereClause;

      // If both id and name are provided, prioritize id
      if (id) {
        whereClause = {
          id: id,
        };
      } else if (name) {
        whereClause = {
          name: {
            equals: name,
            mode: "insensitive" as const,
            // keeping name case-insensitive because even though there could be multiple
            // artists with the same name but different casing, I wouldn't wan to punish
            // the user for not getting the exact casing right of the artist they are looking up.
          },
        };
      }

      if (!whereClause) {
        return null;
      }

      const artist = await ctx.prisma.artist.findFirst({
        where: whereClause,
      });

      return artist;
    }),
});
