-- CreateTable
CREATE TABLE "MostPopularTabs" (
    "id" SERIAL NOT NULL,
    "tabId" INTEGER NOT NULL,

    CONSTRAINT "MostPopularTabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MostPopularArtists" (
    "id" SERIAL NOT NULL,
    "artistId" INTEGER NOT NULL,

    CONSTRAINT "MostPopularArtists_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MostPopularTabs" ADD CONSTRAINT "MostPopularTabs_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MostPopularArtists" ADD CONSTRAINT "MostPopularArtists_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
