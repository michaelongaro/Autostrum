import { motion } from "framer-motion";
import Head from "next/head";
import { buildClerkProps } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps } from "next";
import Image from "next/image";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { AiFillHeart, AiOutlineUser } from "react-icons/ai";
import { BiErrorCircle } from "react-icons/bi";
import { GiMusicalScore } from "react-icons/gi";
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

function ArtistProfile({ artistExists }: { artistExists: boolean }) {
  const { query } = useRouter();
  const {
    serve404Page,
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

  const { data: artist, isLoading: loadingCurrentArtist } =
    api.artist.getByIdOrUsername.useQuery(
      {
        username: usernameFromUrl,
      },
      {
        enabled: !!usernameFromUrl,
      }
    );

  const { data: fetchedTab, refetch: refetchTab } = api.tab.getTabById.useQuery(
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
      // className="baseVertFlex w-full p-2 md:p-8"
      className="lightGlassmorphic baseVertFlex my-12 min-h-[100dvh] w-11/12 !justify-start gap-8 rounded-md px-2 py-4 md:my-24 md:w-3/4 md:gap-16 md:p-8"
    >
      <Head>
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
        {/* should be just homepage ss of idk my profile page? */}
        <meta property="og:image" content=""></meta>
      </Head>

      {/* artist metadata + pinned tab */}
      <div className="baseVertFlex w-full !flex-nowrap gap-4 md:!flex-row md:!items-end md:gap-8">
        <div className="lightestGlassmorphic baseVertFlex min-w-[200px] !flex-nowrap gap-4 rounded-md px-4 py-6">
          <div className="baseVertFlex gap-4">
            <div className="grid grid-cols-1 grid-rows-1">
              {artist || loadingCurrentArtist ? (
                <>
                  <Image
                    src={artist?.profileImageUrl ?? ""}
                    alt={`${artist?.username ?? "Anonymous"}'s profile image`}
                    width={96}
                    height={96}
                    onLoadingComplete={() => {
                      setTimeout(() => {
                        setProfileImageLoaded(true);
                      }, 1000);
                    }}
                    style={{
                      opacity: profileImageLoaded ? 1 : 0,
                    }}
                    className="col-start-1 col-end-2 row-start-1 row-end-2 h-24 w-24 rounded-full object-cover object-center transition-opacity"
                  />
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
              ) : (
                // kinda don't think this is necessary since the user should *always* have a profile image
                // if they have an account right?
                <AiOutlineUser className="my-9 h-16 w-16" />
              )}
            </div>

            {artist ? (
              <p className="max-w-[200px] truncate pb-2 text-xl font-semibold">
                {artist?.username ?? "Anonymous"}
              </p>
            ) : (
              <div className="h-8 w-28 animate-pulse rounded-md bg-pink-300"></div>
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
            <p className="mt-4 text-sm italic">{`joined on ${formatDate(
              artist.createdAt
            )}`}</p>
          ) : (
            <div className="h-6 w-24 animate-pulse rounded-md bg-pink-300"></div>
          )}
        </div>
        {/* pinned tab */}
        <div className="baseVertFlex w-11/12 !flex-nowrap !items-start gap-2 sm:w-3/4 md:w-auto">
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
                  tab={fetchedTab}
                  refetchTab={refetchTab}
                  width={isAboveMediumViewportWidth ? 396.25 : undefined}
                />
              ) : (
                <TabCardSkeleton
                  uniqueKey={`${artist?.id ?? ""}profileTabCardSkeleton`}
                  width={isAboveMediumViewportWidth ? 396.25 : undefined}
                />
              )}
            </>
          )}
        </div>
      </div>
      {/* search Results component */}
      {serve404Page ? (
        <div className="baseVertFlex gap-2 px-8 py-4 md:gap-4">
          <div className="baseFlex gap-4 text-2xl font-bold">
            Search error <BiErrorCircle className="h-8 w-8" />
          </div>
          <div className="text-lg">Unable to load search results.</div>
          <div className="mt-8">
            Please check your URL for any typos and try again.
          </div>
        </div>
      ) : (
        <div className="baseVertFlex mt-8 w-full gap-8">
          <SearchInput initialSearchQueryFromUrl={searchQuery} />

          <SearchResults
            genreId={genreId}
            type={type}
            searchQuery={searchQuery}
            sortByRelevance={sortByRelevance}
            additionalSortFilter={additionalSortFilter}
            viewType={view}
          />
        </div>
      )}
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
