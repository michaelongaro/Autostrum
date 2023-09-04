import { motion } from "framer-motion";
import GenreBubbles from "~/components/Explore/GenreBubbles";
import SearchInput from "~/components/Search/SearchInput";
import { api } from "~/utils/api";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { formatNumber } from "~/utils/formatNumber";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { GiMusicalScore } from "react-icons/gi";
import { AiFillHeart } from "react-icons/ai";
import { TbPinned } from "react-icons/tb";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import formatDate from "~/utils/formatDate";
import GridTabCard from "~/components/Search/GridTabCard";
import PinnedTabPlaceholder from "~/components/Profile/PinnedTabPlaceholder";

function Explore() {
  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const { data: weeklyFeaturedArtistId } =
    api.weeklyFeaturedArtist.getIdOfWeeklyFeaturedArtist.useQuery();

  const { data: artist } = api.artist.getByIdOrUsername.useQuery(
    {
      userId: weeklyFeaturedArtistId ?? "",
    },
    {
      enabled: weeklyFeaturedArtistId !== undefined,
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
      <SearchInput />

      <div className="baseVertFlex w-full !items-start gap-4 p-1 md:p-4">
        <div className="baseVertFlex gap-0 md:gap-1">
          <p className="text-xl font-bold">Weekly featured artist</p>
          <Separator className="w-full bg-pink-500" />
        </div>
        <div className="baseVertFlex w-full !flex-nowrap md:!flex-row md:gap-8">
          <div className="lightestGlassmorphic baseVertFlex h-72 min-w-[200px] !flex-nowrap gap-4 rounded-md p-4 md:h-80 md:gap-8 md:py-8">
            <div className="baseVertFlex gap-4">
              {artist ? (
                <Image
                  src={artist?.profileImageUrl ?? ""}
                  alt={`${artist?.username ?? "Anonymous"}'s profile image`}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full bg-pink-800 object-cover object-center"
                ></Image>
              ) : (
                <Skeleton className="h-16 w-16 rounded-full bg-pink-800" />
              )}

              {artist ? (
                <Button variant={"link"} asChild>
                  <Link
                    href={`/artist/${artist?.username ?? "Anonymous"}`}
                    className="!p-0 !text-xl !font-semibold"
                  >
                    {artist?.username}
                  </Link>
                </Button>
              ) : (
                <Skeleton className="h-6 w-28" />
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
                      <Skeleton className="h-6 w-14" />
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
                      <Skeleton className="h-6 w-14" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent side={"bottom"}>
                    <p>Total likes</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {artist ? (
              <p className="text-sm italic">{`joined on ${formatDate(
                artist.createdAt
              )}`}</p>
            ) : (
              <Skeleton className="h-4 w-24" />
            )}
          </div>
          {/* pinned tab */}
          <div className="baseVertFlex h-80 !flex-nowrap !items-start gap-2">
            <p className="baseFlex gap-2 text-lg font-semibold">
              <TbPinned className="h-5 w-5" />
              Pinned tab
            </p>
            {artist?.pinnedTabId === -1 ? (
              <PinnedTabPlaceholder artistUsername={artist?.username ?? ""} />
            ) : (
              <>
                {fetchedTab ? (
                  <GridTabCard
                    tab={fetchedTab}
                    refetchTab={refetchTab}
                    width={isAboveMediumViewportWidth ? 396.25 : undefined}
                    height={isAboveMediumViewportWidth ? 180 : undefined}
                  />
                ) : (
                  <div className="col-start-1 col-end-2 row-start-1 row-end-2 h-8 w-8 animate-pulse rounded-full bg-pink-300 transition-opacity"></div>
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
