import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { BsMusicNoteBeamed } from "react-icons/bs";
import { FaEye } from "react-icons/fa";
import SearchResults from "~/components/Search/SearchResults";
import { FaStar } from "react-icons/fa6";
import { IoBookmark } from "react-icons/io5";
import { api } from "~/utils/api";
import { formatNumber } from "~/utils/formatNumber";
import GridTabCard from "~/components/Search/GridTabCard";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { FaUser } from "react-icons/fa";
import { TbPinned } from "react-icons/tb";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "~/components/ui/carousel";

interface UserProfile {
  uniqueKey: string;
}

function UserProfile({ uniqueKey }: UserProfile) {
  const { query } = useRouter();
  const { userId: currentUserId } = useAuth();

  const [userScreenshotLoaded, setUserScreenshotLoaded] = useState(false);

  const { data: userMetadata, isFetching: isFetchingUserMetadata } =
    api.user.getProfileMetadataByUsername.useQuery(query.username as string, {
      enabled: query.username !== undefined,
    });

  const { data: currentUser } = api.user.getById.useQuery(currentUserId!, {
    enabled: !!currentUserId,
  });

  const isAboveLargeViewport = useViewportWidthBreakpoint(1024);
  const isAbove2XlViewport = useViewportWidthBreakpoint(1536);

  const [mobileHeaderCarouselApi, setMobileHeaderCarouselApi] =
    useState<CarouselApi>();
  const [mobileHeaderSlide, setMobileHeaderSlide] = useState(0);

  useEffect(() => {
    if (!mobileHeaderCarouselApi) return;

    setMobileHeaderSlide(mobileHeaderCarouselApi.selectedScrollSnap());

    mobileHeaderCarouselApi.on("select", () => {
      setMobileHeaderSlide(mobileHeaderCarouselApi.selectedScrollSnap());
    });

    return () => {
      mobileHeaderCarouselApi.destroy(); // necessary?
    };
  }, [mobileHeaderCarouselApi]);

  console.log(userMetadata);

  return (
    <motion.div
      key={uniqueKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-full max-w-[1400px] !justify-start md:my-24 md:w-3/4 md:p-0"
    >
      <Head>
        <title>{`${userMetadata?.user.username ? `${userMetadata?.user.username}` : "User"} | Autostrum`}</title>
        <meta
          name="description"
          content={`Check out ${
            userMetadata?.user.username
              ? `${userMetadata?.user.username}'s tabs`
              : "this user"
          } on Autostrum.`}
        />
        <meta
          property="og:title"
          content={`${userMetadata?.user.username ? `${userMetadata?.user.username}` : "User"} | Autostrum`}
        ></meta>
        <meta
          property="og:url"
          content={`www.autostrum.com/user/${userMetadata?.user.username}`}
        />
        <meta
          property="og:description"
          content={`Check out ${
            userMetadata?.user.username
              ? `${userMetadata?.user.username}'s tabs`
              : "this user"
          } on Autostrum.`}
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/userProfile.png"
        ></meta>
      </Head>

      <div className="baseVertFlex w-full gap-4">
        <AnimatePresence mode="popLayout">
          {isFetchingUserMetadata ? (
            <motion.div
              key={"userMetadataLoading"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="baseVertFlex w-full gap-4 px-2 lg:!flex-row lg:!items-end lg:!justify-between lg:px-0"
            >
              <div className="baseVertFlex !items-start gap-2">
                <div className="baseFlex gap-1">User</div>

                <div className="baseFlex gap-2">
                  <div className="pulseAnimation size-9 rounded-full bg-pink-300 md:size-10"></div>

                  <div className="pulseAnimation h-[38px] w-36 rounded-md bg-pink-300"></div>
                </div>

                <div className="baseVertFlex mt-4 !items-start gap-2 pb-[25px] font-medium sm:text-lg lg:pb-0 2xl:hidden">
                  <div className="baseFlex w-full !justify-between gap-16">
                    <div className="baseFlex gap-2">
                      <BsMusicNoteBeamed className="size-4 sm:size-5" />
                      <span>Total tabs</span>
                    </div>
                    <div className="pulseAnimation h-5 w-12 self-center rounded-md bg-pink-300"></div>
                  </div>

                  <div className="baseFlex w-full !justify-between gap-16">
                    <div className="baseFlex gap-2">
                      <FaEye className="size-4 sm:size-5" />
                      <span>Total views</span>
                    </div>
                    <div className="pulseAnimation h-5 w-12 self-center rounded-md bg-pink-300"></div>
                  </div>

                  <div className="baseFlex w-full !justify-between gap-16">
                    <div className="baseFlex gap-2">
                      <FaStar className="size-4 sm:size-5" />
                      <span>Average rating</span>
                    </div>
                    <div className="pulseAnimation h-5 w-12 self-center rounded-md bg-pink-300"></div>
                  </div>

                  <div className="baseFlex w-full !justify-between gap-16">
                    <div className="baseFlex gap-2">
                      <IoBookmark className="size-4 sm:size-5" />
                      <span>Bookmarks received</span>
                    </div>
                    <div className="pulseAnimation h-5 w-12 self-center rounded-md bg-pink-300"></div>
                  </div>
                </div>

                <div className="baseFlex !hidden flex-wrap !justify-start gap-4 font-medium sm:text-lg 2xl:!flex">
                  <div className="baseFlex gap-2">
                    <div className="baseFlex gap-2">
                      <BsMusicNoteBeamed className="size-4 sm:size-5" />
                      <span>Total tabs</span>
                    </div>
                    <div className="pulseAnimation h-5 w-12 rounded-md bg-pink-300"></div>
                  </div>

                  <Separator
                    orientation="vertical"
                    className="h-8 opacity-50"
                  />

                  <div className="baseFlex gap-2">
                    <div className="baseFlex gap-2">
                      <FaEye className="size-4 sm:size-5" />
                      <span>Total views</span>
                    </div>
                    <div className="pulseAnimation h-5 w-12 rounded-md bg-pink-300"></div>
                  </div>

                  <Separator
                    orientation="vertical"
                    className="h-8 opacity-50"
                  />

                  <div className="baseFlex gap-2">
                    <div className="baseFlex gap-2">
                      <FaStar className="size-4 sm:size-5" />
                      <span>Average rating</span>
                    </div>
                    <div className="pulseAnimation h-5 w-12 rounded-md bg-pink-300"></div>
                  </div>

                  <Separator
                    orientation="vertical"
                    className="h-8 opacity-50"
                  />

                  <div className="baseFlex gap-2">
                    <div className="baseFlex gap-2">
                      <IoBookmark className="size-4 sm:size-5" />
                      <span>Bookmarks received</span>
                    </div>
                    <div className="pulseAnimation h-5 w-12 rounded-md bg-pink-300"></div>
                  </div>
                </div>
              </div>

              <div className="pulseAnimation hidden h-[94px] w-[330px] rounded-md bg-pink-300 lg:block"></div>
            </motion.div>
          ) : (
            <>
              {/* mobile <Carousel> layout */}
              {!isAboveLargeViewport && !isAbove2XlViewport && (
                <motion.div
                  key={"userMetadataLoaded-mobile"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="baseVertFlex w-full gap-4 px-2"
                >
                  <Carousel
                    setApi={setMobileHeaderCarouselApi}
                    className="baseFlex w-full"
                  >
                    <CarouselContent>
                      <CarouselItem className="baseFlex">
                        <div className="baseVertFlex !items-start gap-2">
                          <div className="baseFlex gap-1">User</div>

                          <div className="baseFlex gap-2">
                            <div className="grid grid-cols-1 grid-rows-1">
                              {userMetadata ? (
                                <Image
                                  src={userMetadata.user.profileImageUrl}
                                  alt={`${userMetadata.user.username}'s profile picture`}
                                  width={300} // TODO: tweak this
                                  height={300} // TODO: tweak this
                                  onLoad={() => {
                                    setTimeout(() => {
                                      setUserScreenshotLoaded(true);
                                    }, 100); // unsure if this is necessary, but it felt too flickery without it
                                  }}
                                  style={{
                                    opacity: userScreenshotLoaded ? 1 : 0,
                                    transition: "opacity 0.3s ease-in-out",
                                  }}
                                  className="col-start-1 col-end-2 row-start-1 row-end-2 size-9 rounded-full object-cover object-center md:size-10"
                                />
                              ) : (
                                <div className="baseFlex size-9 md:size-10">
                                  <FaUser className="size-6 text-pink-50" />
                                </div>
                              )}

                              <AnimatePresence>
                                {!userScreenshotLoaded && userMetadata && (
                                  <motion.div
                                    key={
                                      "gridTabCardSkeletonImageLoader-mobile"
                                    }
                                    initial={{ opacity: 1 }}
                                    animate={{ opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="pulseAnimation z-10 col-start-1 col-end-2 row-start-1 row-end-2 size-9 rounded-full bg-pink-300 md:size-10"
                                  ></motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <h1
                              style={
                                {
                                  // computed font size based on length of user name
                                }
                              }
                              className="baseFlex text-3xl font-semibold tracking-tight text-pink-50 md:left-8 md:top-14 md:text-4xl"
                            >
                              {userMetadata
                                ? userMetadata.user.username
                                : query.username}
                            </h1>
                          </div>

                          <div className="baseVertFlex mt-4 !items-start gap-2 font-medium sm:text-lg 2xl:hidden">
                            <div className="baseFlex w-full !justify-between gap-16">
                              <div className="baseFlex gap-2">
                                <BsMusicNoteBeamed className="size-4 sm:size-5" />
                                <span>Total tabs</span>
                              </div>
                              <span className="w-12 text-end">
                                {formatNumber(
                                  userMetadata
                                    ? userMetadata.user.totalTabs
                                    : 0,
                                )}
                              </span>
                            </div>

                            <div className="baseFlex w-full !justify-between gap-16">
                              <div className="baseFlex gap-2">
                                <FaEye className="size-4 sm:size-5" />
                                <span>Total views</span>
                              </div>
                              <span className="w-12 text-end">
                                {formatNumber(
                                  userMetadata
                                    ? userMetadata.user.totalTabViews
                                    : 0,
                                )}
                              </span>
                            </div>

                            <div className="baseFlex w-full !justify-between gap-16">
                              <div className="baseFlex gap-2">
                                <FaStar className="size-4 sm:size-5" />
                                <span>Average rating</span>
                              </div>
                              <span className="w-12 text-end">
                                {userMetadata
                                  ? userMetadata.user.averageTabRating
                                  : 0}
                              </span>
                            </div>

                            <div className="baseFlex w-full !justify-between gap-16">
                              <div className="baseFlex gap-2">
                                <IoBookmark className="size-4 sm:size-5" />
                                <span>Bookmarks received</span>
                              </div>
                              <span className="w-12 text-end">
                                {formatNumber(
                                  userMetadata
                                    ? userMetadata.user.totalBookmarksReceived
                                    : 0,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CarouselItem>

                      <CarouselItem className="baseFlex">
                        {/* user's pinned tab / placeholder */}
                        {(userMetadata === null ||
                          userMetadata?.pinnedTab === null) && (
                          <div className="lightestGlassmorphic baseVertFlex h-[94px] w-[280px] gap-2 rounded-md border-2">
                            <TbPinned className="size-5 text-pink-50" />
                            No active pinned tab
                          </div>
                        )}

                        {userMetadata?.pinnedTab && (
                          <GridTabCard
                            minimalTab={userMetadata.pinnedTab}
                            currentUser={currentUser}
                            pinnedTabType={"full"}
                          />
                        )}
                      </CarouselItem>
                    </CarouselContent>
                  </Carousel>

                  <div className="baseFlex gap-2">
                    <Button asChild>
                      <div
                        className={`!h-2 !w-8 cursor-pointer rounded-full !p-0 ${mobileHeaderSlide === 0 ? "!bg-pink-800" : "!bg-pink-50"}`}
                        onClick={() => mobileHeaderCarouselApi?.scrollTo(0)}
                      />
                    </Button>
                    <Button asChild>
                      <div
                        className={`!h-2 !w-8 cursor-pointer rounded-full !p-0 ${mobileHeaderSlide === 1 ? "!bg-pink-800" : "!bg-pink-50"}`}
                        onClick={() => mobileHeaderCarouselApi?.scrollTo(1)}
                      />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* > lg but < 2xl */}
              {isAboveLargeViewport && !isAbove2XlViewport && (
                <motion.div
                  key={"userMetadataLoaded-lg"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="baseFlex w-full !items-end !justify-between gap-4"
                >
                  <div className="baseVertFlex !items-start gap-2">
                    <div className="baseFlex gap-1">User</div>

                    <div className="baseFlex gap-2">
                      <div className="grid grid-cols-1 grid-rows-1">
                        {userMetadata ? (
                          <Image
                            src={userMetadata.user.profileImageUrl}
                            alt={`${userMetadata.user.username}'s profile picture`}
                            width={300} // TODO: tweak this
                            height={300} // TODO: tweak this
                            onLoad={() => {
                              setTimeout(() => {
                                setUserScreenshotLoaded(true);
                              }, 100); // unsure if this is necessary, but it felt too flickery without it
                            }}
                            style={{
                              opacity: userScreenshotLoaded ? 1 : 0,
                              transition: "opacity 0.3s ease-in-out",
                            }}
                            className="col-start-1 col-end-2 row-start-1 row-end-2 size-9 rounded-full object-cover object-center md:size-10"
                          />
                        ) : (
                          <div className="baseFlex size-9 md:size-10">
                            <FaUser className="size-6 text-pink-50" />
                          </div>
                        )}

                        <AnimatePresence>
                          {!userScreenshotLoaded && userMetadata && (
                            <motion.div
                              key={"gridTabCardSkeletonImageLoader-lg"}
                              initial={{ opacity: 1 }}
                              animate={{ opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="pulseAnimation z-10 col-start-1 col-end-2 row-start-1 row-end-2 size-9 rounded-full bg-pink-300 md:size-10"
                            ></motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <h1
                        style={
                          {
                            // computed font size based on length of user name
                          }
                        }
                        className="baseFlex text-3xl font-semibold tracking-tight text-pink-50 md:left-8 md:top-14 md:text-4xl"
                      >
                        {userMetadata
                          ? userMetadata.user.username
                          : query.username}
                      </h1>
                    </div>

                    <div className="baseVertFlex mt-4 !items-start gap-2 font-medium sm:text-lg 2xl:hidden">
                      <div className="baseFlex w-full !justify-between gap-16">
                        <div className="baseFlex gap-2">
                          <BsMusicNoteBeamed className="size-4 sm:size-5" />
                          <span>Total tabs</span>
                        </div>
                        <span className="w-12 text-end">
                          {formatNumber(
                            userMetadata ? userMetadata.user.totalTabs : 0,
                          )}
                        </span>
                      </div>

                      <div className="baseFlex w-full !justify-between gap-16">
                        <div className="baseFlex gap-2">
                          <FaEye className="size-4 sm:size-5" />
                          <span>Total views</span>
                        </div>
                        <span className="w-12 text-end">
                          {formatNumber(
                            userMetadata ? userMetadata.user.totalTabViews : 0,
                          )}
                        </span>
                      </div>

                      <div className="baseFlex w-full !justify-between gap-16">
                        <div className="baseFlex gap-2">
                          <FaStar className="size-4 sm:size-5" />
                          <span>Average rating</span>
                        </div>
                        <span className="w-12 text-end">
                          {userMetadata
                            ? userMetadata.user.averageTabRating
                            : 0}
                        </span>
                      </div>

                      <div className="baseFlex w-full !justify-between gap-16">
                        <div className="baseFlex gap-2">
                          <IoBookmark className="size-4 sm:size-5" />
                          <span>Bookmarks received</span>
                        </div>
                        <span className="w-12 text-end">
                          {formatNumber(
                            userMetadata
                              ? userMetadata.user.totalBookmarksReceived
                              : 0,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* user's pinned tab / placeholder */}
                  {(userMetadata === null ||
                    userMetadata?.pinnedTab === null) && (
                    <div className="lightestGlassmorphic baseVertFlex h-[94px] w-[280px] gap-2 rounded-md border-2">
                      <TbPinned className="size-5 text-pink-50" />
                      No active pinned tab
                    </div>
                  )}
                  {userMetadata?.pinnedTab && (
                    <GridTabCard
                      minimalTab={userMetadata.pinnedTab}
                      currentUser={currentUser}
                      pinnedTabType={"full"}
                    />
                  )}
                </motion.div>
              )}

              {/* > 2xl */}
              {isAbove2XlViewport && (
                <motion.div
                  key={"userMetadataLoaded-2xl"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="baseFlex w-full !items-end !justify-between gap-4"
                >
                  <div className="baseVertFlex !items-start gap-2">
                    User
                    <div className="baseFlex gap-2">
                      <div className="grid grid-cols-1 grid-rows-1">
                        {userMetadata ? (
                          <Image
                            src={userMetadata.user.profileImageUrl}
                            alt={`${userMetadata.user.username}'s profile picture`}
                            width={300} // TODO: tweak this
                            height={300} // TODO: tweak this
                            onLoad={() => {
                              setTimeout(() => {
                                setUserScreenshotLoaded(true);
                              }, 100); // unsure if this is necessary, but it felt too flickery without it
                            }}
                            style={{
                              opacity: userScreenshotLoaded ? 1 : 0,
                              transition: "opacity 0.3s ease-in-out",
                            }}
                            className="col-start-1 col-end-2 row-start-1 row-end-2 size-9 rounded-full object-cover object-center md:size-10"
                          />
                        ) : (
                          <div className="baseFlex size-9 md:size-10">
                            <FaUser className="size-6 text-pink-50" />
                          </div>
                        )}

                        <AnimatePresence>
                          {!userScreenshotLoaded && userMetadata && (
                            <motion.div
                              key={"gridTabCardSkeletonImageLoader-2xl"}
                              initial={{ opacity: 1 }}
                              animate={{ opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="pulseAnimation z-10 col-start-1 col-end-2 row-start-1 row-end-2 size-9 rounded-t-none bg-pink-300 md:size-10"
                            ></motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <h1
                        style={
                          {
                            // computed font size based on length of user name
                          }
                        }
                        className="baseFlex text-3xl font-semibold tracking-tight text-pink-50 md:left-8 md:top-14 md:text-4xl"
                      >
                        {userMetadata
                          ? userMetadata.user.username
                          : query.username}
                      </h1>
                    </div>
                    <div className="baseFlex flex-wrap !justify-start gap-4 font-medium sm:text-lg">
                      <div className="baseFlex gap-2">
                        <div className="baseFlex gap-2">
                          <BsMusicNoteBeamed className="size-4 sm:size-5" />
                          <span>Total tabs</span>
                        </div>
                        <span className="w-12 text-end">
                          {formatNumber(
                            userMetadata ? userMetadata.user.totalTabs : 0,
                          )}
                        </span>
                      </div>

                      <Separator
                        orientation="vertical"
                        className="h-8 opacity-50"
                      />

                      <div className="baseFlex gap-2">
                        <div className="baseFlex gap-2">
                          <FaEye className="size-4 sm:size-5" />
                          <span>Total views</span>
                        </div>
                        <span className="w-12 text-end">
                          {formatNumber(
                            userMetadata ? userMetadata.user.totalTabViews : 0,
                          )}
                        </span>
                      </div>

                      <Separator
                        orientation="vertical"
                        className="h-8 opacity-50"
                      />

                      <div className="baseFlex gap-2">
                        <div className="baseFlex gap-2">
                          <FaStar className="size-4 sm:size-5" />
                          <span>Average rating</span>
                        </div>
                        <span className="w-12 text-end">
                          {userMetadata
                            ? userMetadata.user.averageTabRating
                            : 0}
                        </span>
                      </div>

                      <Separator
                        orientation="vertical"
                        className="h-8 opacity-50"
                      />

                      <div className="baseFlex gap-2">
                        <div className="baseFlex gap-2">
                          <IoBookmark className="size-4 sm:size-5" />
                          <span>Bookmarks received</span>
                        </div>
                        <span className="w-12 text-end">
                          {formatNumber(
                            userMetadata
                              ? userMetadata.user.totalBookmarksReceived
                              : 0,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* user's pinned tab / placeholder */}
                  {(userMetadata === null ||
                    userMetadata?.pinnedTab === null) && (
                    <div className="lightestGlassmorphic baseVertFlex h-[94px] w-[330px] gap-2 rounded-md border-2">
                      <TbPinned className="size-5 text-pink-50" />
                      No active pinned tab
                    </div>
                  )}

                  {userMetadata?.pinnedTab && (
                    <GridTabCard
                      minimalTab={userMetadata.pinnedTab}
                      currentUser={currentUser}
                      pinnedTabType={"withoutScreenshot"}
                    />
                  )}
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>

        <SearchResults
          isFetchingUserMetadata={isFetchingUserMetadata}
          userDoesNotExist={userMetadata === null}
        />
      </div>
    </motion.div>
  );
}

export default UserProfile;
