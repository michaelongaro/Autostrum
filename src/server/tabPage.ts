import { cache } from "react";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import { selectRelatedTabSections } from "~/utils/relatedTabs";
import { SITE_URL } from "~/utils/seo";
interface OpenGraphData {
  title: string;
  url: string;
  description: string;
}
export const getTabPageData = cache(async (idParam: string) => {
  const { prisma } = await import("~/server/db");

  const id = /^\d+$/.test(idParam) ? Number(idParam) : -1;
  if (!Number.isSafeInteger(id) || id < 1) return null;

  const tab = await prisma.tab.findUnique({
    where: {
      id,
    },
    include: {
      artist: {
        select: {
          id: true,
          name: true,
          isVerified: true,
        },
      },
    },
  });

  if (!tab) return null;

  const relatedRows = await prisma.tab.findMany({
    where: {
      id: { not: tab.id },
      title: { not: "" },
    },
    select: {
      id: true,
      title: true,
      genre: true,
      tuning: true,
      difficulty: true,
      key: true,
      capo: true,
      artistId: true,
      createdAt: true,
      updatedAt: true,
      averageRating: true,
      ratingsCount: true,
      artist: {
        select: {
          id: true,
          name: true,
          isVerified: true,
        },
      },
      createdBy: {
        select: {
          userId: true,
          username: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const relatedTabSections = selectRelatedTabSections(
    {
      id: tab.id,
      artistId: tab.artist?.id ?? tab.artistId,
      genre: tab.genre,
      tuning: tab.tuning,
      difficulty: tab.difficulty,
      key: tab.key,
      capo: tab.capo,
    },
    relatedRows.map(toRelatedTabCandidate),
  );

  const openGraphData = buildOpenGraphData(tab);
  const relatedArtistName = tab.artist?.name.trim() ?? "";
  const relatedArtist =
    tab.artist && relatedArtistName
      ? { id: tab.artist.id, name: relatedArtistName }
      : null;

  const tabWithArtistMetadata: TabWithArtistMetadata = {
    ...tab,
    artistId: tab.artist?.id || null,
    artistName: tab.artist?.name,
    artistIsVerified: tab.artist?.isVerified,
  };

  return {
    tab: tabWithArtistMetadata,
    openGraphData,
    relatedTabSections,
    relatedArtist,
  };
});

function toRelatedTabCandidate(tab: {
  id: number;
  title: string;
  genre: string;
  tuning: string;
  difficulty: number;
  key: string | null;
  capo: number;
  artistId: number | null;
  createdAt: Date;
  updatedAt: Date;
  averageRating: number;
  ratingsCount: number;
  artist: {
    id: number;
    name: string;
    isVerified: boolean;
  } | null;
  createdBy: {
    userId: string;
    username: string;
  } | null;
}) {
  return {
    id: tab.id,
    title: tab.title,
    genre: tab.genre,
    tuning: tab.tuning,
    difficulty: tab.difficulty,
    key: tab.key,
    capo: tab.capo,
    artistId: tab.artist?.id ?? tab.artistId,
    createdAt: tab.createdAt,
    updatedAt: tab.updatedAt,
    averageRating: tab.averageRating,
    ratingsCount: tab.ratingsCount,
    artist: tab.artist
      ? {
          id: tab.artist.id,
          name: tab.artist.name,
          isVerified: tab.artist.isVerified,
        }
      : null,
    createdBy: tab.createdBy
      ? {
          userId: tab.createdBy.userId,
          username: tab.createdBy.username,
        }
      : null,
  };
}

function buildOpenGraphData(tab: {
  id: number;
  title: string;
  genre: string;
  artist: { name: string } | null;
}): OpenGraphData {
  const artistName = tab.artist?.name.trim();
  const byArtist = artistName ? ` by ${artistName}` : "";
  const genre = tab.genre.trim();
  const genrePrefix = genre ? `${genre} ` : "";

  return {
    title: `${tab.title}${byArtist} | Autostrum`,
    url: `${SITE_URL}/tab/${tab.id}/${encodeURIComponent(tab.title)}`,
    description: `View the ${genrePrefix}guitar tab for ${tab.title}${byArtist} on Autostrum.`,
  };
}
