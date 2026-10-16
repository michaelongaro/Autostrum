-- CreateTable
CREATE TABLE "WeeklyTabView" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tabId" INTEGER NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WeeklyTabView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyTabView_tabId_key" ON "WeeklyTabView"("tabId");

-- AddForeignKey
ALTER TABLE "WeeklyTabView" ADD CONSTRAINT "WeeklyTabView_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
