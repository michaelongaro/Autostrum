import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { tabDocumentSchema } from "~/utils/tabDocument";

const idSchema = z.string().uuid();
const revisionSchema = z.number().int().min(0);
const privateDraftProcedure = protectedProcedure.use(({ ctx, next }) => {
  ctx.res.setHeader("Cache-Control", "private, no-store");
  return next();
});
const conflict = () =>
  new TRPCError({
    code: "CONFLICT",
    message:
      "This draft changed or was removed in another session. Your work is still saved on this device.",
  });

export const draftRouter = createTRPCRouter({
  list: privateDraftProcedure
    .input(z.object({ ownerId: z.string() }))
    .query(({ ctx }) =>
      ctx.prisma.tabDraft.findMany({
        where: { ownerId: ctx.auth.userId, deletedAt: null },
        select: {
          id: true,
          title: true,
          sourceTabId: true,
          revision: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      }),
    ),

  get: privateDraftProcedure
    .input(z.object({ id: idSchema, ownerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const draft = await ctx.prisma.tabDraft.findFirst({
        where: { id: input.id, ownerId: ctx.auth.userId, deletedAt: null },
      });
      return draft
        ? { ...draft, document: tabDocumentSchema.parse(draft.document) }
        : null;
    }),

  forTab: privateDraftProcedure
    .input(
      z.object({
        sourceTabId: z.number().int().positive(),
        ownerId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const draft = await ctx.prisma.tabDraft.findFirst({
        where: {
          sourceTabId: input.sourceTabId,
          ownerId: ctx.auth.userId,
          deletedAt: null,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      });
      return draft
        ? { ...draft, document: tabDocumentSchema.parse(draft.document) }
        : null;
    }),

  save: privateDraftProcedure
    .input(
      z.object({
        id: idSchema,
        mutationId: idSchema,
        expectedRevision: revisionSchema,
        sourceTabId: z.number().int().positive().nullable(),
        baseUpdatedAt: z.date().nullable(),
        document: tabDocumentSchema.refine(
          (document) => JSON.stringify(document).length <= 2_000_000,
          "Draft is too large.",
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.auth.userId;
      return ctx.prisma.$transaction(async (tx) => {
        if (input.sourceTabId !== null) {
          const source = await tx.tab.findFirst({
            where: { id: input.sourceTabId, createdByUserId: ownerId },
            select: { id: true },
          });
          if (!source || !input.baseUpdatedAt)
            throw new TRPCError({ code: "NOT_FOUND" });
        }

        const previous = await tx.tabDraft.findFirst({
          where: { id: input.id, ownerId },
        });
        if (
          previous &&
          !previous.deletedAt &&
          previous.lastMutationId === input.mutationId
        ) {
          return { revision: previous.revision, updatedAt: previous.updatedAt };
        }
        if (
          previous &&
          (previous.sourceTabId !== input.sourceTabId ||
            previous.baseUpdatedAt?.getTime() !==
              input.baseUpdatedAt?.getTime())
        ) {
          throw conflict();
        }

        if (input.expectedRevision === 0) {
          const created = await tx.tabDraft.createMany({
            data: {
              id: input.id,
              ownerId,
              title: input.document.title,
              document: input.document,
              sourceTabId: input.sourceTabId,
              baseUpdatedAt: input.baseUpdatedAt,
              lastMutationId: input.mutationId,
            },
            skipDuplicates: true,
          });
          if (created.count !== 1) throw conflict();
        } else {
          const updated = await tx.tabDraft.updateMany({
            where: {
              id: input.id,
              ownerId,
              revision: input.expectedRevision,
              deletedAt: null,
            },
            data: {
              title: input.document.title,
              document: input.document,
              lastMutationId: input.mutationId,
              revision: { increment: 1 },
            },
          });
          if (updated.count !== 1) throw conflict();
        }
        const saved = await tx.tabDraft.findFirstOrThrow({
          where: { id: input.id, ownerId },
        });
        return { revision: saved.revision, updatedAt: saved.updatedAt };
      });
    }),

  discard: privateDraftProcedure
    .input(z.object({ id: idSchema, expectedRevision: revisionSchema }))
    .mutation(async ({ ctx, input }) => {
      const removed = await ctx.prisma.tabDraft.updateMany({
        where: {
          id: input.id,
          ownerId: ctx.auth.userId,
          revision: input.expectedRevision,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          revision: { increment: 1 },
          document: {},
          title: "",
        },
      });
      if (removed.count !== 1) throw conflict();
      return { id: input.id };
    }),
});
