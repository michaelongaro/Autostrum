import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const tabRouter = createTRPCRouter({
  getTabById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input, ctx }) => {
      return ctx.prisma.tab.findUnique({
        where: {
          id: input.id,
        },
      });
    }),

  // technically should be private, but don't have to worry about auth yet
  createOrUpdate: publicProcedure
    .input(
      z.object({
        id: z.number().nullable(),
        createdById: z.string(),
        title: z.string(),
        description: z.string().nullable(),
        genreId: z.number(),
        tuning: z.string(),
        bpm: z.number(),
        timeSignature: z.string().nullable(),
        capo: z.number().nullable(),
        tabData: z.array(
          z.object({ title: z.string(), data: z.array(z.array(z.string())) })
        ),
        sectionProgression: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            repetitions: z.number(),
          })
        ),
        type: z.enum(["create", "update"]),
      })
    )
    .mutation(({ input, ctx }) => {
      if (input.type === "create") {
        return ctx.prisma.tab.create({
          data: {
            createdById: input.createdById,
            title: input.title,
            description: input.description,
            genreId: input.genreId,
            tuning: input.tuning,
            sectionProgression: input.sectionProgression,
            bpm: input.bpm,
            timeSignature: input.timeSignature,
            capo: input.capo,
            tabData: input.tabData,
          },
        });
      } else if (input.type === "update" && input.id !== null) {
        return ctx.prisma.tab.update({
          where: {
            id: input.id,
          },
          data: {
            title: input.title,
            description: input.description,
            genreId: input.genreId,
            tuning: input.tuning,
            sectionProgression: input.sectionProgression,
            bpm: input.bpm,
            timeSignature: input.timeSignature,
            capo: input.capo,
            tabData: input.tabData,
          },
        });
      }
    }),
});
