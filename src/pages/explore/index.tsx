import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { AiFillHeart, AiOutlineUser } from "react-icons/ai";
import { GiMusicalScore } from "react-icons/gi";
import { TbPinned } from "react-icons/tb";
import PinnedTabPlaceholder from "~/components/Profile/PinnedTabSelector";
import GridTabCard from "~/components/Search/GridTabCard";
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
import { formatNumber } from "~/utils/formatNumber";

import GuitarImage from "public/explore/header.jpg";
import GenreCards from "~/components/Explore/GenreCards";

function Explore() {
  const { userId } = useAuth();
  const { push } = useRouter();

  const [profileImageLoaded, setProfileImageLoaded] = useState(false);

  const isAboveMediumViewport = useViewportWidthBreakpoint(768);

  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  const { data: weeklyFeaturedUserId } =
    api.weeklyFeaturedUser.getUserId.useQuery();

  const { data: user, isLoading: loadingCurrentArtist } =
    api.user.getById.useQuery(weeklyFeaturedUserId!, {
      enabled: !!weeklyFeaturedUserId,
    });

  const { data: fetchedTab } = api.search.getMinimalTabById.useQuery(
    user?.pinnedTabId ?? -1,
    {
      enabled: user?.pinnedTabId !== -1,
    },
  );

  return (
    <motion.div
      key={"explore"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-full max-w-[1400px] !justify-start md:my-24 md:w-3/4 md:p-0 xl:w-8/12"
    >
      <Head>
        <title>Explore | Autostrum</title>
        <meta
          name="description"
          content="Find inspiration from our evergrowing library of tabs and discover new talents in our weekly featured user section."
        />
        <meta property="og:title" content="Explore | Autostrum"></meta>
        <meta property="og:url" content="www.autostrum.com/explore" />
        <meta
          property="og:description"
          content="Find inspiration from our evergrowing library of tabs and discover new talents in our weekly featured user section."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/explore.png"
        ></meta>
      </Head>

      <div className="baseVertFlex w-full gap-4">
        <div className="baseFlex relative w-full gap-4 px-2 md:px-0">
          <h1 className="baseFlex absolute left-6 top-8 text-3xl font-semibold tracking-tight text-pink-50 md:left-8 md:top-14 md:text-4xl">
            Explore
          </h1>

          <Image
            src={GuitarImage}
            alt={"hi"}
            className="h-24 w-full rounded-lg object-cover object-top md:h-36"
          />
        </div>

        <div className="baseVertFlex lightGlassmorphic w-full !items-start !justify-start gap-8 rounded-lg p-4">
          {/* weekly featured user */}
          <div className="baseVertFlex w-full !items-start gap-0 p-1 md:gap-4 md:p-4">
            <div className="baseVertFlex gap-0 md:gap-1">
              <p className="text-xl font-bold md:text-[1.35rem]">
                Weekly featured user
              </p>
              <Separator className="w-full bg-pink-600" />
            </div>
            <div className="baseVertFlex w-full !flex-nowrap lg:!flex-row lg:!items-end lg:gap-8">
              <div className="baseFlex h-[285px]">
                <div className="lightestGlassmorphic baseVertFlex min-w-[200px] !flex-nowrap gap-3 rounded-md px-4 py-6">
                  <div className="baseVertFlex gap-4">
                    <div className="grid grid-cols-1 grid-rows-1">
                      {user || loadingCurrentArtist ? (
                        <>
                          {user && (
                            <Link
                              href={`/user/${user.username}`}
                              className="col-start-1 col-end-2 row-start-1 row-end-2 h-24 w-24"
                            >
                              <Image
                                src={user.profileImageUrl}
                                alt={`${
                                  user?.username ?? "Anonymous"
                                }'s profile image`}
                                width={300}
                                height={300}
                                quality={100}
                                onLoad={() => {
                                  setProfileImageLoaded(true);
                                }}
                                onClick={() =>
                                  void push(
                                    `/user/${user?.username ?? "Anonymous"}`,
                                  )
                                }
                                style={{
                                  opacity: profileImageLoaded ? 1 : 0,
                                  width: "6rem",
                                  height: "6rem",
                                }}
                                className="h-24 w-24 rounded-full object-cover object-center shadow-md transition-opacity"
                              />
                            </Link>
                          )}

                          <div
                            style={{
                              opacity: !profileImageLoaded ? 1 : 0,
                              zIndex: !profileImageLoaded ? 1 : -1,
                            }}
                            className={`col-start-1 col-end-2 row-start-1 row-end-2 h-24 w-24 rounded-full bg-pink-300 shadow-md transition-opacity ${!profileImageLoaded ? "pulseAnimation" : ""} `}
                          ></div>
                        </>
                      ) : (
                        <div className="baseFlex h-24 w-24 rounded-full border-2 shadow-md">
                          <AiOutlineUser className="h-16 w-16" />
                        </div>
                      )}
                    </div>

                    {user ? (
                      <Button
                        variant={"link"}
                        asChild
                        className="inline-block max-w-[200px]"
                      >
                        <Link
                          href={`/user/${user?.username ?? "Anonymous"}`}
                          className="block truncate !p-0 !text-xl !font-semibold"
                        >
                          {user?.username}
                        </Link>
                      </Button>
                    ) : (
                      <div className="pulseAnimation my-3 h-6 w-28 rounded-md bg-pink-300"></div>
                    )}
                  </div>

                  <div className="baseFlex gap-4">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {user ? (
                            <div className="baseFlex gap-2">
                              <GiMusicalScore className="h-6 w-6" />
                              {formatNumber(user.totalTabs)}
                            </div>
                          ) : (
                            <div className="pulseAnimation h-6 w-14 rounded-md bg-pink-300"></div>
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
                          {user ? (
                            <div className="baseFlex gap-2">
                              <AiFillHeart className="h-6 w-6 text-pink-800" />
                              {formatNumber(user.totalBookmarksReceived)}
                            </div>
                          ) : (
                            <div className="pulseAnimation h-6 w-14 rounded-md bg-pink-300"></div>
                          )}
                        </TooltipTrigger>
                        <TooltipContent side={"bottom"}>
                          <p>Total bookmarks</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>

              {/* pinned tab */}
              <div className="baseVertFlex !flex-nowrap !items-start gap-2">
                <p className="baseFlex gap-2 text-lg font-semibold">
                  <TbPinned className="size-5" />
                  Pinned tab
                </p>
                {user?.pinnedTabId === -1 ? null : ( // <PinnedTabPlaceholder />
                  <AnimatePresence mode="sync">
                    {fetchedTab ? (
                      <GridTabCard
                        minimalTab={fetchedTab}
                        currentUser={currentUser}
                        largeVariant={isAboveMediumViewport}
                      />
                    ) : (
                      <TabCardSkeleton
                        uniqueKey={`${user?.id ?? ""}profileTabCardSkeleton`}
                        largeVariant={isAboveMediumViewport}
                        hideArtist
                      />
                    )}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>

          <div className="baseVertFlex w-full !items-start gap-4 p-1 md:p-4">
            <div className="baseVertFlex gap-0 md:gap-1">
              <p className="text-xl font-bold md:text-[1.35rem]">Genres</p>
              <Separator className="w-full bg-pink-600" />
            </div>

            <div className="grid w-full grid-cols-2 place-items-center gap-4 lg:grid-cols-3 2xl:grid-cols-4">
              <GenreCards />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Explore;
