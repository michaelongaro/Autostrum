import { PrismaClient } from "@prisma/client";

export default async function handler() {
  const prisma = new PrismaClient();

  // get current weekly featured artist
  const currentFeaturedArtist = await prisma.weeklyFeaturedArtist.findFirst();

  // use that userId to exclude from total pool of artists (ones that have pinnedTabId)
  // get all artists that have pinnedTabId
  const elegibleArtistIds = await prisma.artist.findMany({
    where: {
      pinnedTabId: {
        gt: -1,
      },
    },
    select: {
      userId: true,
    },
  });

  const filteredArtistIds = elegibleArtistIds.filter(
    (artist) => artist.userId !== currentFeaturedArtist!.artistId
  );

  const randomIndex = Math.floor(Math.random() * filteredArtistIds.length);
  const newFeaturedArtistId = filteredArtistIds[randomIndex]?.userId;

  if (newFeaturedArtistId !== undefined) {
    // update the artistId of row id 0 to new artistId
    await prisma.weeklyFeaturedArtist.update({
      where: {
        id: 0,
      },
      data: {
        artistId: newFeaturedArtistId,
      },
    });
  }
}
