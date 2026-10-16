import { motion } from "framer-motion";
import type { GetStaticProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import superjson from "superjson";
import RelatedTabs from "~/components/Tab/Static/RelatedTabs";
import StaticTab from "~/components/Tab/Static/StaticTab";
import Binoculars from "~/components/ui/icons/Binoculars";
import { useHydrateTabStore } from "~/hooks/useHydrateTabStore";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import {
  selectRelatedTabSections,
  type RelatedTabCandidate,
  type RelatedTabSection,
} from "~/utils/relatedTabs";

interface OpenGraphData {
  title: string;
  url: string;
  description: string;
}

interface RelatedArtistLink {
  id: number;
  name: string;
}

interface PageData {
  tab: TabWithArtistMetadata | null;
  openGraphData: OpenGraphData;
  relatedTabSections: RelatedTabSection<RelatedTabCandidate>[];
  relatedArtist: RelatedArtistLink | null;
}

const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_DOMAIN_URL ?? "https://www.autostrum.com"
).replace(/\/$/, "");

/**
 * Related links are computed with the page. Refresh them on a steady interval
 * so newly published tabs join the graph without waiting for an edit of every
 * older page. On-demand revalidation still refreshes a tab immediately when
 * that tab itself is saved.
 */
const RELATED_TABS_REVALIDATE_SECONDS = 60 * 60;

function ViewIndividualTab({ json }: { json: string }) {
  const { asPath } = useRouter();

  const { tab, openGraphData, relatedTabSections, relatedArtist } =
    superjson.parse<PageData>(json);

  useHydrateTabStore({
    fetchedTab: tab,
  });

  return (
    <motion.div
      key={"viewingTab"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: asPath.includes("screenshot") ? 0 : 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-full !justify-start md:my-24 md:w-[85%] md:p-0 2xl:w-[70%]"
    >
      <Head>
        <title>{openGraphData.title}</title>
        <meta name="description" content={openGraphData.description} />
        <meta property="og:title" content={openGraphData.title} />
        <meta property="og:url" content={openGraphData.url} />
        <meta property="og:description" content={openGraphData.description} />
        <meta property="og:site_name" content="Autostrum" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/homepage.png"
        ></meta>
        {tab && <link rel="canonical" href={openGraphData.url} />}
      </Head>

      {tab ? (
        <>
          <StaticTab />
          <RelatedTabs sections={relatedTabSections} artist={relatedArtist} />
        </>
      ) : (
        <TabNotFound />
      )}
    </motion.div>
  );
}

export default ViewIndividualTab;

export const getStaticProps: GetStaticProps = async (ctx) => {
  const { prisma } = await import("~/server/db");

  const id = ctx.params?.id ? parseInt(ctx.params.id as string) : -1;

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

  if (!tab) {
    return {
      props: {
        json: superjson.stringify({
          tab: null,
          relatedTabSections: [],
          relatedArtist: null,
          openGraphData: {
            title: "Autostrum",
            url: `${SITE_ORIGIN}/`,
            description: "View and listen to this tab on Autostrum.",
          },
        }),
      },
    };
  }

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
    props: {
      json: superjson.stringify({
        tab: tabWithArtistMetadata,
        openGraphData,
        relatedTabSections,
        relatedArtist,
      }),
    },
    revalidate: RELATED_TABS_REVALIDATE_SECONDS,
  };
};

export async function getStaticPaths() {
  // Pre-render no paths at build time, generate all on demand

  return {
    paths: [],
    fallback: "blocking",
  };
}

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
}): RelatedTabCandidate {
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
    url: `${SITE_ORIGIN}/tab/${tab.id}/${encodeURIComponent(tab.title)}`,
    description: `View the ${genrePrefix}guitar tab for ${tab.title}${byArtist} on Autostrum.`,
  };
}

function TabNotFound() {
  return (
    <motion.div
      key={"staticTabNotFound"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[calc(100dvh-4rem-6rem)] w-full max-w-[1400px] md:my-24 md:min-h-[calc(100dvh-4rem-12rem)] md:w-3/4"
    >
      <div className="baseVertFlex my-auto w-10/12 gap-4 rounded-md border bg-background p-4 shadow-lg md:w-[500px]">
        <div className="baseFlex gap-3 sm:gap-4">
          <div className="baseVertFlex gap-2">
            <Binoculars className="size-6 sm:size-9" />
            <h1 className="text-xl font-bold sm:text-2xl">Tab not found</h1>
          </div>
        </div>
        <p className="text-center text-base sm:text-lg">
          The tab you are looking for does not exist. Please check the URL and
          try again.
        </p>
      </div>
    </motion.div>
  );
}
