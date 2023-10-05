import { motion } from "framer-motion";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { AiFillHeart, AiOutlineUser } from "react-icons/ai";
import { GiMusicalScore } from "react-icons/gi";
import { TbPinned } from "react-icons/tb";
import GenreBubbles from "~/components/Explore/GenreBubbles";
import PinnedTabPlaceholder from "~/components/Profile/PinnedTabPlaceholder";
import GridTabCard from "~/components/Search/GridTabCard";
import SearchInput from "~/components/Search/SearchInput";
import TabCardSkeleton from "~/components/Search/TabCardSkeleton";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { api } from "~/utils/api";
import formatDate from "~/utils/formatDate";
import { formatNumber } from "~/utils/formatNumber";

function Explore() {
  const { push } = useRouter();
  const [profileImageLoaded, setProfileImageLoaded] = useState(false);

  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const { data: weeklyFeaturedArtistId } =
    api.weeklyFeaturedArtist.getIdOfWeeklyFeaturedArtist.useQuery();

  const { data: artist, isLoading: loadingCurrentArtist } =
    api.artist.getByIdOrUsername.useQuery(
      {
        userId: weeklyFeaturedArtistId as string,
      },
      {
        enabled: !!weeklyFeaturedArtistId,
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

  return (
    <motion.div
      key={"explore"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="lightGlassmorphic baseVertFlex my-12 min-h-[100dvh] w-11/12 !justify-start gap-8 rounded-md px-2 py-4 md:my-24 md:w-3/4 md:p-8 xl:w-8/12"
    >
      <Head>
        <title>Explore | Autostrum</title>
        <meta property="og:title" content="Explore | Autostrum"></meta>
        <meta property="og:url" content="www.autostrum.com/explore" />
        <meta
          property="og:description"
          content="Find inspiration from our evergrowing library of tabs and discover new talents in our weekly featured artist section."
        />
        <meta property="og:type" content="website" />
        {/* should be just homepage ss of main explore page */}
        <meta property="og:image" content=""></meta>
      </Head>

      <SearchInput />

      <div className="baseVertFlex w-full !items-start gap-4 p-1 md:p-4">
        <div className="baseVertFlex gap-0 md:gap-1">
          <p className="text-xl font-bold">Weekly featured artist</p>
          <Separator className="w-full bg-pink-500" />
        </div>
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
                      onClick={() =>
                        void push(`/artist/${artist?.username ?? "Anonymous"}`)
                      }
                      style={{
                        opacity: profileImageLoaded ? 1 : 0,
                      }}
                      className="col-start-1 col-end-2 row-start-1 row-end-2 h-24 w-24 cursor-pointer rounded-full object-cover object-center transition-opacity"
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
                  <AiOutlineUser className="h-8 w-8" />
                )}
              </div>

              {artist ? (
                <Button
                  variant={"link"}
                  asChild
                  className="inline-block max-w-[200px]"
                >
                  <Link
                    href={`/artist/${artist?.username ?? "Anonymous"}`}
                    className="block truncate !p-0 !text-xl !font-semibold"
                  >
                    {artist?.username}
                  </Link>
                </Button>
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
      </div>

      <GenreBubbles />
    </motion.div>
  );
}

export default Explore;
