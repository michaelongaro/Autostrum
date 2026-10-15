import { TRPCError } from "@trpc/server";
import type { Prisma } from "~/generated/client";
import type { DraftReference } from "~/utils/tabDocument";

/** Runs in the publication transaction, so a late autosave cannot revive a draft. */
export async function claimDraftForPublication(
  tx: Prisma.TransactionClient,
  reference: DraftReference | undefined,
  ownerId: string,
  sourceTabId: number | null,
) {
  if (!reference) return null;

  const draft = await tx.tabDraft.findFirst({
    where: { id: reference.id, ownerId },
  });
  if (draft?.sourceTabId !== sourceTabId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found." });
  }

  // Replaying a successful publication after a lost response is safe.
  if (draft.publishedTabId !== null) {
    const tab = await tx.tab.findFirst({
      where: { id: draft.publishedTabId, createdByUserId: ownerId },
    });
    if (tab) return tab;
  }

  if (sourceTabId !== null) {
    const original = await tx.tab.findFirst({
      where: { id: sourceTabId, createdByUserId: ownerId },
      select: { updatedAt: true },
    });
    if (
      !original ||
      original.updatedAt.getTime() !== draft.baseUpdatedAt?.getTime()
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "The published tab changed. Recover your draft as a new tab or reload the latest published version.",
      });
    }
  }

  const claimed = await tx.tabDraft.updateMany({
    where: {
      id: reference.id,
      ownerId,
      revision: reference.revision,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      revision: { increment: 1 },
      document: {},
      title: "",
    },
  });
  if (claimed.count !== 1) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This draft changed in another session. Your recovery copy is still on this device.",
    });
  }
  return null;
}

export async function finishDraftPublication(
  tx: Prisma.TransactionClient,
  reference: DraftReference | undefined,
  tabId: number,
) {
  if (reference) {
    await tx.tabDraft.update({
      where: { id: reference.id },
      data: { publishedTabId: tabId },
    });
  }
}
