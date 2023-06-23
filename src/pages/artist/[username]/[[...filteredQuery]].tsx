import { useRouter } from "next/router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { BiErrorCircle } from "react-icons/bi";
import SearchInput from "~/components/Search/SearchInput";
import SearchResults from "~/components/Search/SearchResults";
import useGetUrlParamFilters from "~/hooks/useGetUrlParamFilters";
import { api } from "~/utils/api";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { formatNumber } from "~/utils/formatNumber";
import { GiMusicalScore } from "react-icons/gi";
import { AiFillHeart } from "react-icons/ai";
import { Skeleton } from "~/components/ui/skeleton";
import formatDate from "~/utils/formatDate";
import useViewTypeFromLocalStorage from "~/hooks/useViewTypeFromLocalStorage";

function ArtistProfile() {
  const router = useRouter();
  const {
    serve404Page,
    genreId,
    type,
    searchQuery,
    sortByRelevance,
    additionalSortFilter,
  } = useGetUrlParamFilters();

  const viewType = useViewTypeFromLocalStorage();

  const usernameFromUrl = useMemo(() => {
    if (typeof router.query.username === "string") {
      return router.query.username;
    }
    return "";
  }, [router.query.username]);

  const { data: artist } = api.artist.getByIdOrUsername.useQuery(
    {
      username: usernameFromUrl,
    },
    {
      enabled: !!usernameFromUrl,
    }
  );

  return (
    <motion.div
      key={"artistProfile"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      // className="baseVertFlex w-full p-2 md:p-8"
      className="lightGlassmorphic baseVertFlex my-24 min-h-[100dvh] w-10/12 !justify-start gap-8 rounded-md p-2 md:w-3/4 md:p-8"
    >
      {/* artist metadata + pinned tab */}
      <div className="baseFlex !justify-between">
        <div className="lightGlassmorphic baseVertFlex gap-8 rounded-md p-4 md:p-8">
          <div className="baseVertFlex gap-4">
            {artist ? (
              <Image
                src={artist?.profileImageUrl ?? ""}
                alt={`${artist?.username ?? "Anonymous"}'s profile image`}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full bg-pink-800"
              ></Image>
            ) : (
              <Skeleton className="h-16 w-16 rounded-full bg-pink-800" />
            )}

            {artist ? (
              <p className="text-xl font-semibold">
                {artist?.username ?? "Anonymous"}
              </p>
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
        <>
          <SearchInput initialSearchQueryFromUrl={searchQuery} />

          <SearchResults
            genreId={genreId}
            type={type}
            searchQuery={searchQuery}
            sortByRelevance={sortByRelevance}
            additionalSortFilter={additionalSortFilter}
            viewType={viewType}
          />
        </>
      )}
    </motion.div>
  );
}

export default ArtistProfile;
