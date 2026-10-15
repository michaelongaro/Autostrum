CREATE TABLE "TabDraft" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "sourceTabId" INTEGER,
    "baseUpdatedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "lastMutationId" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "publishedTabId" INTEGER,
    CONSTRAINT "TabDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TabDraft_ownerId_deletedAt_updatedAt_idx" ON "TabDraft"("ownerId", "deletedAt", "updatedAt");
CREATE INDEX "TabDraft_ownerId_sourceTabId_idx" ON "TabDraft"("ownerId", "sourceTabId");
ALTER TABLE "TabDraft" ADD CONSTRAINT "TabDraft_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
