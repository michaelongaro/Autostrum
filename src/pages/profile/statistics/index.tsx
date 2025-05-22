import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { FaStar } from "react-icons/fa6";
import { IoStatsChart } from "react-icons/io5";
import { IoBookmark } from "react-icons/io5";
import { TbGuitarPick } from "react-icons/tb";
import { FaEye, FaUser, FaTrophy } from "react-icons/fa";
import { IoDiceOutline, IoCalendarOutline } from "react-icons/io5";
import { IoIosArrowBack } from "react-icons/io";
import Binoculars from "~/components/ui/icons/Binoculars";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "~/components/ui/carousel";
import { useEffect, useState } from "react";
import { Separator } from "~/components/ui/separator";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

function UserStatistics() {
  const { userId } = useAuth();

  const { data: currentUser, isFetching: isFetchingCurrentUser } =
    api.user.getStatistics.useQuery(userId!, {
      enabled: !!userId,
    });

  const isAboveSmViewport = useViewportWidthBreakpoint(640);

  const [topFiveStatsCarouselApi, setTopFiveStatsCarouselApi] =
    useState<CarouselApi>();
  const [topFiveStatsSlide, setTopFiveStatsSlide] = useState(0);

  // first column header is always "Rank" and second column header is always "Title"
  const topFiveStatsHeaders = ["Views", "Bookmarks", "Rating"];

  const topFiveStatsPlaceholder = new Map<
    string,
    { id: number; title: string; value: string }
  >([
    ["1st", { id: 0, title: "", value: "" }],
    ["2nd", { id: 0, title: "", value: "" }],
    ["3rd", { id: 0, title: "", value: "" }],
    ["4th", { id: 0, title: "", value: "" }],
    ["5th", { id: 0, title: "", value: "" }],
  ]);

  const [miscStatsCarouselApi, setMiscStatsCarouselApi] =
    useState<CarouselApi>();
  const [miscStatsSlide, setMiscStatsSlide] = useState(0);

  // second column header is always "Tabs"
  const miscStatsHeaders = ["Genre", "Tuning", "Difficulty", "Capo", "Artist"];

  const miscStatsPlaceholder = new Map<string, number>([
    ["Rock", 0],
    ["Indie", 0],
    ["Jazz", 0],
    ["Pop", 0],
    ["Folk", 0],
    ["Country", 0],
    ["Blues", 0],
    ["Hip-Hop", 0],
    ["Electronic", 0],
    ["Classical", 0],
    ["Metal", 0],
    ["Misc.", 0],
  ]);

  useEffect(() => {
    if (!topFiveStatsCarouselApi || !miscStatsCarouselApi) return;

    setTopFiveStatsSlide(topFiveStatsCarouselApi.selectedScrollSnap());
    setMiscStatsSlide(miscStatsCarouselApi.selectedScrollSnap());

    topFiveStatsCarouselApi.on("select", () => {
      setTopFiveStatsSlide(topFiveStatsCarouselApi.selectedScrollSnap());
    });

    miscStatsCarouselApi.on("select", () => {
      setMiscStatsSlide(miscStatsCarouselApi.selectedScrollSnap());
    });

    return () => {
      topFiveStatsCarouselApi.destroy(); // necessary?
      miscStatsCarouselApi.destroy(); // necessary?
    };
  }, [topFiveStatsCarouselApi, miscStatsCarouselApi]);

  return (
    <motion.div
      key={"userStatistics"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-full max-w-[1400px] !justify-start md:my-24 md:w-3/4 md:p-0"
    >
      <Head>
        <title>{`${currentUser?.username ? `${currentUser.username}` : "Tabs"} | Autostrum`}</title>
        <meta
          name="description"
          content={`Check out ${
            currentUser?.username
              ? `${currentUser.username}'s songs`
              : "this currentUser"
          } on Autostrum.`}
        />
        <meta
          property="og:title"
          content={`${currentUser?.username ? `${currentUser.username}` : "Artist"} | Autostrum`}
        ></meta>
        <meta
          property="og:url"
          content={`www.autostrum.com/currentUser/${currentUser?.username}`}
        />
        <meta
          property="og:description"
          content={`Check out ${
            currentUser?.username
              ? `${currentUser.username}'s songs`
              : "this currentUser"
          } on Autostrum.`}
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://www.autostrum.com/opengraphScreenshots/artistProfile.png"
        ></meta>
      </Head>

      <div className="baseVertFlex w-full gap-4">
        <div className="baseFlex w-full !justify-start md:!hidden">
          <span className="ml-8 text-3xl font-semibold tracking-tight !text-pink-50 md:text-4xl">
            Statistics
          </span>
        </div>

        <div className="baseFlex !hidden w-full !justify-start gap-4 md:!flex">
          <Button variant={"text"} asChild>
            <Link
              href={"/profile/settings"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-pink-50/50 hover:!text-pink-50 active:!text-pink-50/75 lg:!text-4xl"
            >
              Settings
            </Link>
          </Button>
          <Button variant={"text"} asChild>
            <Link
              href={"/profile/statistics"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-pink-50 hover:!text-pink-50 active:text-pink-50/75 lg:!text-4xl"
            >
              Statistics
            </Link>
          </Button>
          <Button variant={"text"} asChild>
            <Link
              href={"/profile/tabs/filters"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-pink-50/50 hover:!text-pink-50 active:!text-pink-50/75 lg:!text-4xl"
            >
              Tabs
            </Link>
          </Button>
          <Button variant={"text"} asChild>
            <Link
              href={"/profile/bookmarks/filters"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-pink-50/50 hover:!text-pink-50 active:!text-pink-50/75 lg:!text-4xl"
            >
              Bookmarks
            </Link>
          </Button>
        </div>

        <div className="baseVertFlex lightGlassmorphic min-h-[calc(100dvh-4rem-6rem-56px)] w-full !items-start gap-12 rounded-lg p-4 md:min-h-[calc(100dvh-4rem-12rem-56px)] md:p-8 xl:!flex-row">
          <AnimatePresence mode="popLayout">
            {/* main stats */}
            <div className="baseVertFlex w-full gap-4 xl:w-1/2">
              <div className="baseVertFlex w-full gap-2">
                <div className="baseFlex w-full !justify-start gap-3">
                  <FaUser className="size-5 text-pink-50 lg:size-6" />
                  <span className="text-xl font-semibold text-pink-50 lg:text-2xl">
                    Overview
                  </span>
                </div>
                <Separator
                  orientation="horizontal"
                  className="h-[2px] w-full bg-pink-50"
                />
              </div>

              <div className="baseVertFlex w-full !items-start gap-4 md:mt-4 md:gap-8">
                <div className="baseFlex w-full !justify-between gap-2">
                  <div className="baseFlex gap-2">
                    <TbGuitarPick className="size-5 text-pink-50 lg:size-6" />
                    <span className="text-xl font-medium text-pink-50 lg:text-2xl">
                      Total tabs
                    </span>
                  </div>
                  {currentUser ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-8 text-2xl font-semibold text-pink-50 lg:text-3xl"
                    >
                      {currentUser.totalTabs}
                    </motion.span>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pulseAnimation ml-8 h-5 w-8 rounded-md bg-pink-300"
                    ></motion.div>
                  )}
                </div>

                <Separator
                  orientation="horizontal"
                  className="h-[1px] w-full bg-pink-50/50"
                />

                <div className="baseFlex w-full !justify-between gap-2">
                  <div className="baseFlex gap-2">
                    <FaEye className="size-5 text-pink-50 lg:size-6" />
                    <span className="text-xl font-medium text-pink-50 lg:text-2xl">
                      Total tab views
                    </span>
                  </div>
                  {currentUser ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-8 text-2xl font-semibold text-pink-50 lg:text-3xl"
                    >
                      {currentUser.totalTabViews}
                    </motion.span>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pulseAnimation ml-8 h-5 w-8 rounded-md bg-pink-300"
                    ></motion.div>
                  )}
                </div>

                <Separator
                  orientation="horizontal"
                  className="h-[1px] w-full bg-pink-50/50"
                />

                <div className="baseFlex w-full !justify-between gap-2">
                  <div className="baseFlex gap-2">
                    <FaStar className="size-5 text-pink-50 lg:size-6" />
                    <span className="text-xl font-medium text-pink-50 lg:text-2xl">
                      Average rating
                    </span>
                  </div>
                  {currentUser ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-8 text-2xl font-semibold text-pink-50 lg:text-3xl"
                    >
                      {currentUser.averageTabRating}
                    </motion.span>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pulseAnimation ml-8 h-5 w-8 rounded-md bg-pink-300"
                    ></motion.div>
                  )}
                </div>

                <Separator
                  orientation="horizontal"
                  className="h-[1px] w-full bg-pink-50/50"
                />

                <div className="baseFlex w-full !justify-between gap-2">
                  <div className="baseFlex gap-2">
                    <IoStatsChart className="size-5 text-pink-50 lg:size-6" />
                    <span className="text-xl font-medium text-pink-50 lg:text-2xl">
                      Total ratings
                    </span>
                  </div>
                  {currentUser ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-8 text-2xl font-semibold text-pink-50 lg:text-3xl"
                    >
                      {currentUser.totalTabRatings}
                    </motion.span>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pulseAnimation ml-8 h-5 w-8 rounded-md bg-pink-300"
                    ></motion.div>
                  )}
                </div>

                <Separator
                  orientation="horizontal"
                  className="h-[1px] w-full bg-pink-50/50"
                />

                <div className="baseFlex w-full !justify-between gap-2">
                  <div className="baseFlex gap-2">
                    <IoBookmark className="size-5 text-pink-50 lg:size-6" />
                    <span className="text-xl font-medium text-pink-50 lg:text-2xl">
                      Total bookmarks received
                    </span>
                  </div>
                  {currentUser ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-8 text-2xl font-semibold text-pink-50 lg:text-3xl"
                    >
                      {currentUser.totalBookmarksReceived}
                    </motion.span>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pulseAnimation ml-8 h-5 w-8 rounded-md bg-pink-300"
                    ></motion.div>
                  )}
                </div>

                <Separator
                  orientation="horizontal"
                  className="h-[1px] w-full bg-pink-50/50"
                />

                <div className="baseFlex w-full !justify-between gap-2">
                  <div className="baseFlex gap-2">
                    <IoCalendarOutline className="size-5 text-pink-50 lg:size-6" />
                    <span className="text-xl font-medium text-pink-50 lg:text-2xl">
                      Member since
                    </span>
                  </div>
                  {currentUser ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-9 text-lg font-semibold text-pink-50 lg:text-xl"
                    >
                      {currentUser.createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: isAboveSmViewport ? "long" : "short",
                        day: "numeric",
                      })}
                    </motion.span>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pulseAnimation ml-9 h-5 w-8 rounded-md bg-pink-300"
                    ></motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* top 5 tabs + misc stats tables*/}
            <div className="baseVertFlex w-full !items-start gap-12 xl:w-1/2 xl:gap-4">
              <div className="baseVertFlex w-full gap-2">
                <div className="baseVertFlex w-full gap-2">
                  <div className="baseFlex w-full !justify-start gap-3">
                    <FaTrophy className="size-5 text-pink-50 lg:size-6" />
                    <span className="text-xl font-semibold text-pink-50 lg:text-2xl">
                      Top 5
                    </span>
                  </div>
                  <Separator
                    orientation="horizontal"
                    className="h-[2px] w-full bg-pink-50"
                  />
                </div>

                <div className="baseFlex relative w-full">
                  <Table>
                    <colgroup>
                      {/* Rank */}
                      <col className="w-[100px]" />

                      {/* Title */}
                      <col className="w-auto" />

                      {/* Views/Bookmarks/Ratings */}
                      <col className="w-[150px]" />
                    </colgroup>

                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-8 px-4">Rank</TableHead>
                        <TableHead className="h-8 px-4">Title</TableHead>
                        <TableHead className="h-8 px-4">
                          {topFiveStatsHeaders[topFiveStatsSlide]}
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody className="relative w-full">
                      <>
                        {(!currentUser ||
                        isFetchingCurrentUser ||
                        currentUser.totalTabs === 0
                          ? [...topFiveStatsPlaceholder.entries()]
                          : [
                              ...currentUser.topFiveStats[
                                topFiveStatsSlide
                              ]!.entries(),
                            ]
                        ).map(([rank, tab]) => (
                          <TableRow key={rank} className="w-full">
                            <TableCell>
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="w-full"
                              >
                                <span className="font-semibold text-pink-50">
                                  {rank}
                                </span>
                              </motion.div>
                            </TableCell>

                            <TableCell>
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="w-full"
                              >
                                <Link
                                  href={`/tab/${tab.id}/${encodeURIComponent(tab.title)}`}
                                  className="!p-0 !text-base !font-semibold md:!text-lg"
                                >
                                  <span className="max-w-[230px] truncate sm:max-w-[300px]">
                                    {tab.title}
                                  </span>
                                </Link>
                              </motion.div>
                            </TableCell>

                            <TableCell>
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="w-full"
                              >
                                <span className="font-semibold text-pink-50">
                                  {tab.value}
                                </span>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    </TableBody>
                  </Table>

                  {(!currentUser ||
                    currentUser.totalTabs === 0 ||
                    isFetchingCurrentUser) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="baseVertFlex absolute left-0 top-8 h-[calc(100%-2rem)] w-full bg-black/65"
                    >
                      {/* <div className="absolute left-0 top-0 size-full blur-sm" /> */}

                      {!currentUser && (
                        <motion.svg
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="size-4 animate-stableSpin rounded-full bg-transparent fill-none md:size-6"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </motion.svg>
                      )}

                      {currentUser && currentUser.totalTabs === 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="baseVertFlex absolute left-0 top-0 size-full gap-2"
                        >
                          <Binoculars className="size-8 text-pink-50 md:size-10" />
                          <span className="text-xl font-semibold text-pink-50 md:text-2xl">
                            No tabs found
                          </span>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>

                <div className="baseFlex w-full gap-2">
                  <Button
                    variant={"text"}
                    disabled={isFetchingCurrentUser}
                    className="baseFlex !p-0"
                    onClick={() => {
                      topFiveStatsCarouselApi?.scrollTo(
                        topFiveStatsSlide === 0 ? 2 : topFiveStatsSlide - 1,
                      );
                    }}
                  >
                    <IoIosArrowBack className="size-4 text-pink-50" />
                  </Button>

                  <Carousel
                    setApi={setTopFiveStatsCarouselApi}
                    opts={{
                      loop: true,
                    }}
                    className={`baseFlex w-48 ${isFetchingCurrentUser ? "pointer-events-none" : ""}`}
                  >
                    <CarouselContent>
                      <CarouselItem className="baseFlex">
                        Most popular
                      </CarouselItem>

                      <CarouselItem className="baseFlex">
                        Most bookmarked
                      </CarouselItem>

                      <CarouselItem className="baseFlex">
                        Highest rated
                      </CarouselItem>
                    </CarouselContent>
                  </Carousel>

                  <Button
                    variant={"text"}
                    disabled={isFetchingCurrentUser}
                    className="baseFlex !p-0"
                    onClick={() => {
                      topFiveStatsCarouselApi?.scrollTo(
                        topFiveStatsSlide === 2 ? 0 : topFiveStatsSlide + 1,
                      );
                    }}
                  >
                    <IoIosArrowBack className="size-4 rotate-180 text-pink-50" />
                  </Button>
                </div>
              </div>

              <div className="baseVertFlex w-full gap-2">
                <div className="baseVertFlex w-full gap-2">
                  <div className="baseFlex w-full !justify-start gap-3">
                    <IoDiceOutline className="size-5 text-pink-50 lg:size-6" />
                    <span className="text-xl font-semibold text-pink-50 lg:text-2xl">
                      Misc.
                    </span>
                  </div>
                  <Separator
                    orientation="horizontal"
                    className="h-[2px] w-full bg-pink-50"
                  />
                </div>

                <div className="baseFlex w-full text-sm text-muted-foreground">
                  <div className="baseFlex ml-4 w-1/2 !justify-start">
                    {miscStatsHeaders[miscStatsSlide]}
                  </div>
                  <div className="baseFlex ml-4 w-1/2 !justify-start">
                    # of tabs
                  </div>
                </div>

                <OverlayScrollbarsComponent
                  options={{
                    scrollbars: { autoHide: "leave", autoHideDelay: 150 },
                    overflow: {
                      y:
                        !currentUser ||
                        isFetchingCurrentUser ||
                        currentUser.totalTabs === 0
                          ? "hidden"
                          : "scroll",
                    },
                  }}
                  defer
                  className="!w-full"
                >
                  <div
                    style={{
                      transform: "translateZ(0)",
                    }}
                    className="baseFlex relative h-[185.5px] w-full !items-start"
                  >
                    <Table>
                      <TableBody className="relative w-full">
                        <>
                          {(!currentUser ||
                          isFetchingCurrentUser ||
                          currentUser.totalTabs === 0
                            ? [...miscStatsPlaceholder.entries()]
                            : [
                                ...currentUser.miscStats[
                                  miscStatsSlide
                                ]!.entries(),
                              ]
                          ).map(([category, numberOfTabs]) => (
                            <TableRow key={category} className="w-full">
                              <TableCell>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="w-full"
                                >
                                  <span className="font-semibold text-pink-50">
                                    {category}
                                  </span>
                                </motion.div>
                              </TableCell>

                              <TableCell>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="w-full"
                                >
                                  <span className="font-semibold text-pink-50">
                                    {numberOfTabs}
                                  </span>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      </TableBody>
                    </Table>

                    {(!currentUser ||
                      currentUser.totalTabs === 0 ||
                      isFetchingCurrentUser) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="baseVertFlex absolute left-0 top-0 size-full bg-black/65"
                      >
                        {!currentUser && (
                          <motion.svg
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="size-4 animate-stableSpin rounded-full bg-transparent fill-none md:size-6"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </motion.svg>
                        )}

                        {currentUser && currentUser.totalTabs === 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="baseVertFlex absolute left-0 top-0 size-full gap-2"
                          >
                            <Binoculars className="size-8 text-pink-50 md:size-10" />
                            <span className="text-xl font-semibold text-pink-50 md:text-2xl">
                              No tabs found
                            </span>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </OverlayScrollbarsComponent>

                <div className="baseFlex w-full gap-2">
                  <Button
                    variant={"text"}
                    disabled={isFetchingCurrentUser}
                    className="baseFlex !p-0"
                    onClick={() => {
                      miscStatsCarouselApi?.scrollTo(
                        miscStatsSlide === 0 ? 4 : topFiveStatsSlide - 1,
                      );
                    }}
                  >
                    <IoIosArrowBack className="size-4 text-pink-50" />
                  </Button>

                  <Carousel
                    setApi={setMiscStatsCarouselApi}
                    opts={{
                      loop: true,
                    }}
                    className={`baseFlex w-48 ${isFetchingCurrentUser ? "pointer-events-none" : ""}`}
                  >
                    <CarouselContent>
                      <CarouselItem className="baseFlex">
                        Tabs by genre
                      </CarouselItem>

                      <CarouselItem className="baseFlex">
                        Tabs by tuning
                      </CarouselItem>

                      <CarouselItem className="baseFlex">
                        Tabs by difficulty
                      </CarouselItem>

                      <CarouselItem className="baseFlex">
                        Tabs by capo
                      </CarouselItem>

                      <CarouselItem className="baseFlex">
                        Tabs by artist
                      </CarouselItem>
                    </CarouselContent>
                  </Carousel>

                  <Button
                    variant={"text"}
                    disabled={isFetchingCurrentUser}
                    className="baseFlex !p-0"
                    onClick={() => {
                      miscStatsCarouselApi?.scrollTo(
                        miscStatsSlide === 4 ? 0 : miscStatsSlide + 1,
                      );
                    }}
                  >
                    <IoIosArrowBack className="size-4 rotate-180 text-pink-50" />
                  </Button>
                </div>
              </div>
            </div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default UserStatistics;
