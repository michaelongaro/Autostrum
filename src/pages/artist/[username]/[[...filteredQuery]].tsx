import { motion } from "framer-motion";
import Head from "next/head";
import { buildClerkProps } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps } from "next";
import Image from "next/image";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { AiFillHeart } from "react-icons/ai";
import { GiMusicalScore } from "react-icons/gi";
import { BiErrorCircle } from "react-icons/bi";
import { TbPinned } from "react-icons/tb";
import PinnedTabPlaceholder from "~/components/Profile/PinnedTabPlaceholder";
import GridTabCard from "~/components/Search/GridTabCard";
import SearchInput from "~/components/Search/SearchInput";
import SearchResults from "~/components/Search/SearchResults";
import TabCardSkeleton from "~/components/Search/TabCardSkeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import useGetUrlParamFilters from "~/hooks/useGetUrlParamFilters";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { api } from "~/utils/api";
import formatDate from "~/utils/formatDate";
import { formatNumber } from "~/utils/formatNumber";
import Render404Page from "~/components/Search/Render404Page";
import NoResultsFoundBubbles from "~/components/Search/NoResultsFoundBubbles";

function ArtistProfile({ artistExists }: { artistExists: boolean }) {
  const { query } = useRouter();
  const {
    serve404Page,
    initializedWithParams,
    genreId,
    type,
    view,
    searchQuery,
    sortByRelevance,
    additionalSortFilter,
  } = useGetUrlParamFilters();

  const [profileImageLoaded, setProfileImageLoaded] = useState(false);

  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const usernameFromUrl = useMemo(() => {
    if (typeof query.username === "string") {
      return query.username;
    }
    return "";
  }, [query.username]);

  const { data: artist, isFetching: isFetchingArtist } =
    api.artist.getByIdOrUsername.useQuery(
      {
        username: usernameFromUrl,
      },
      {
        enabled: !!usernameFromUrl,
      }
    );

  const { data: fetchedTab, refetch: refetchTab } =
    api.tab.getMinimalTabById.useQuery(
      {
        id: artist?.pinnedTabId ?? -1,
      },
      {
        enabled: artist?.pinnedTabId !== -1,
      }
    );

  if (!artistExists) {
    return <ArtistNotFound />;
  }

  return (
    <motion.div
      key={"artistProfile"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="lightGlassmorphic baseVertFlex
      my-12 min-h-[100dvh] w-11/12 !justify-start gap-8 rounded-md px-2 py-4 md:my-24 md:w-3/4 md:gap-16 md:p-8"
    >
      <Head>
        <title>{`${query.username as string}'s profile | Autostrum`}</title>
        <meta
          name="description"
          content={`Visit ${
            query.username as string
          }'s profile and listen to their tabs.`}
        />
        <meta
          property="og:title"
          content={`${query.username as string}'s profile | Autostrum`}
        ></meta>
        <meta
          property="og:url"
          content={`www.autostrum.com/artist/${query.username as string}`}
        />
        <meta
          property="og:description"
          content={`Visit ${
            query.username as string
          }'s profile and listen to their tabs.`}
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/viewingUserProfile.png"
        ></meta>
      </Head>

      {/* artist metadata + pinned tab */}
      <div className="baseVertFlex w-full !flex-nowrap gap-4 md:!flex-row md:!items-end md:gap-8">
        <div className="lightestGlassmorphic baseVertFlex min-w-[200px] !flex-nowrap gap-3 rounded-md px-4 py-6">
          <div className="baseVertFlex gap-4">
            <div className="grid grid-cols-1 grid-rows-1">
              <>
                {artist && (
                  <Image
                    src={artist?.profileImageUrl ?? ""}
                    alt={`${artist?.username ?? "Anonymous"}'s profile image`}
                    width={300}
                    height={300}
                    quality={100}
                    onLoadingComplete={() => {
                      setProfileImageLoaded(true);
                    }}
                    style={{
                      opacity: profileImageLoaded ? 1 : 0,
                      width: "6rem",
                      height: "6rem",
                    }}
                    className="col-start-1 col-end-2 row-start-1 row-end-2 h-24 w-24 rounded-full object-cover object-center transition-opacity"
                  />
                )}
                <div
                  style={{
                    opacity: !profileImageLoaded ? 1 : 0,
                    zIndex: !profileImageLoaded ? 1 : -1,
                  }}
                  className={`col-start-1 col-end-2 row-start-1 row-end-2 h-24 w-24 rounded-full bg-pink-300 transition-opacity
                              ${!profileImageLoaded ? "animate-pulse" : ""}
                            `}
                ></div>
              </>
            </div>

            {artist ? (
              <p className="max-w-[200px] truncate pb-2 text-xl font-semibold">
                {artist?.username ?? "Anonymous"}
              </p>
            ) : (
              <div className="my-3 h-6 w-28 animate-pulse rounded-md bg-pink-300"></div>
            )}
          </div>

          <div className="baseFlex gap-4">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {artist ? (
                    <div className="baseFlex gap-2">
                      <GiMusicalScore className="h-6 w-6" />
                      {formatNumber(artist.numberOfTabs)}
                    </div>
                  ) : (
                    <div className="h-6 w-14 animate-pulse rounded-md bg-pink-300"></div>
                  )}
                </TooltipTrigger>
                <TooltipContent side={"bottom"}>
                  <p>Total tabs</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {artist ? (
                    <div className="baseFlex gap-2">
                      <AiFillHeart className="h-6 w-6 text-pink-800" />
                      {formatNumber(artist.numberOfLikes)}
                    </div>
                  ) : (
                    <div className="h-6 w-14 animate-pulse rounded-md bg-pink-300"></div>
                  )}
                </TooltipTrigger>
                <TooltipContent side={"bottom"}>
                  <p>Total likes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {artist ? (
            <p className="mt-[1.3rem] text-sm italic text-pink-200">{`joined on ${formatDate(
              artist.createdAt
            )}`}</p>
          ) : (
            <div className="mb-1 mt-3 h-4 w-24 animate-pulse rounded-md bg-pink-300"></div>
          )}
        </div>
        {/* pinned tab */}
        <div className="baseVertFlex !flex-nowrap !items-start gap-2">
          <p className="baseFlex gap-2 text-lg font-semibold">
            <TbPinned className="h-5 w-5" />
            Pinned tab
          </p>
          {artist?.pinnedTabId === -1 ? (
            <PinnedTabPlaceholder />
          ) : (
            <>
              {fetchedTab ? (
                <GridTabCard
                  minimalTab={fetchedTab}
                  refetchTab={refetchTab}
                  largeVariant={isAboveMediumViewportWidth}
                />
              ) : (
                <TabCardSkeleton
                  uniqueKey={`${artist?.id ?? ""}profileTabCardSkeleton`}
                  largeVariant={isAboveMediumViewportWidth}
                  hideArtist
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* search Results component */}
      <div className="baseVertFlex mt-8 w-full gap-8">
        <SearchInput initialSearchQueryFromUrl={searchQuery} />
        {serve404Page ? (
          <Render404Page />
        ) : (
          <>
            {initializedWithParams && (
              <SearchResults
                genreId={genreId}
                type={type}
                searchQuery={searchQuery}
                sortByRelevance={sortByRelevance}
                additionalSortFilter={additionalSortFilter}
                viewType={view}
              />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export default ArtistProfile;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const prisma = new PrismaClient();
  const artist = await prisma.artist.findUnique({
    where: {
      username: ctx.params?.username ? (ctx.params.username as string) : "",
    },
  });

  return {
    props: {
      artistExists: artist !== null,
      ...buildClerkProps(ctx.req),
    },
  };
};

function ArtistNotFound() {
  return (
    <div className="lightGlassmorphic baseVertFlex w-10/12 gap-4 rounded-md p-4 md:w-[500px]">
      <div className="baseFlex gap-4">
        <NoResultsFoundBubbles color={"#ec4899"} />
        <div className="baseFlex gap-2">
          <BiErrorCircle className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Artist not found</h1>
        </div>
        <NoResultsFoundBubbles color={"#ec4899"} reverseBubblePositions />
      </div>
      <p className="text-center text-lg">
        The artist you are looking for does not exist. Please check the URL and
        try again.
      </p>
    </div>
  );
}
