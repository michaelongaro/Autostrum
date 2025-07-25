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
import Spinner from "~/components/ui/Spinner";

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
          <span className="ml-4 text-3xl font-semibold tracking-tight !text-foreground md:text-4xl">
            Statistics
          </span>
        </div>

        <div className="baseFlex !hidden w-full !justify-start gap-4 md:!flex">
          <Button variant={"text"} asChild>
            <Link
              prefetch={false}
              href={"/profile/settings"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground/50 hover:!text-foreground active:!text-foreground/75 lg:!text-4xl"
            >
              Settings
            </Link>
          </Button>
          <Button variant={"text"} asChild>
            <Link
              prefetch={false}
              href={"/profile/statistics"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground hover:!text-foreground active:text-foreground/75 lg:!text-4xl"
            >
              Statistics
            </Link>
          </Button>
          <Button variant={"text"} asChild>
            <Link
              prefetch={false}
              href={"/profile/tabs/filters"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground/50 hover:!text-foreground active:!text-foreground/75 lg:!text-4xl"
            >
              Tabs
            </Link>
          </Button>
          <Button variant={"text"} asChild>
            <Link
              prefetch={false}
              href={"/profile/bookmarks/filters"}
              className="!p-0 !text-3xl font-semibold tracking-tight !text-foreground/50 hover:!text-foreground active:!text-foreground/75 lg:!text-4xl"
            >
              Bookmarks
            </Link>
          </Button>
        </div>

        <div className="baseVertFlex min-h-[calc(100dvh-4rem-6rem-56px)] w-full !items-start gap-12 border-y bg-background p-4 shadow-lg md:min-h-[calc(100dvh-4rem-12rem-56px)] md:rounded-lg md:border md:p-8 xl:!flex-row">
          <AnimatePresence mode="popLayout">
            {/* main stats */}
            <div className="baseVertFlex w-full gap-4 xl:w-1/2">
              <div className="baseVertFlex w-full gap-2">
                <div className="baseFlex w-full !justify-start gap-3">
                  <FaUser className="size-5 text-foreground lg:size-6" />
                  <span className="text-xl font-semibold text-foreground lg:text-2xl">
                    Overview
                  </span>
                </div>
                <Separator
                  orientation="horizontal"
                  className="h-[2px] w-full bg-foreground"
                />
              </div>

              <div className="baseVertFlex w-full !items-start gap-4 md:mt-4 md:gap-8">
                <div className="baseFlex w-full !justify-between gap-2">
                  <div className="baseFlex gap-3 xs:gap-4">
                    <TbGuitarPick className="size-5 text-foreground lg:size-6" />
                    <span className="text-xl font-medium text-foreground lg:text-2xl">
                      Total tabs
                    </span>
                  </div>
                  {currentUser ? (
                    <motion.span
                      key={"totalTabs"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-8 text-2xl font-semibold text-foreground lg:text-3xl"
                    >
                      {currentUser.totalTabs}
                    </motion.span>
                  ) : (
                    <motion.div
                      key={"totalTabsPlaceholder"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pulseAnimation ml-8 h-8 w-20 rounded-md bg-foreground/50 lg:h-9"
                    ></motion.div>
                  )}
                </div>

                <Separator
                  orientation="horizontal"
                  className="h-[1px] w-full bg-foreground/50"
                />

                <div className="baseFlex w-full !justify-between gap-2">
                  <div className="baseFlex gap-3 xs:gap-4">
                    <FaEye className="size-5 text-foreground lg:size-6" />
                    <span className="text-xl font-medium text-foreground lg:text-2xl">
                      Total tab views
                    </span>
                  </div>
                  {currentUser ? (
                    <motion.span
                      key={"totalTabViews"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-8 text-2xl font-semibold text-foreground lg:text-3xl"
                    >
                      {currentUser.totalTabViews}
                    </motion.span>
                  ) : (
                    <motion.div
                      key={"totalTabViewsPlaceholder"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pulseAnimation ml-8 h-8 w-20 rounded-md bg-foreground/50 lg:h-9"
                    ></motion.div>
                  )}
                </div>

                <Separator
                  orientation="horizontal"
                  className="h-[1px] w-full bg-foreground/50"
                />

                <div className="baseFlex w-full !justify-between gap-2">
                  <div className="baseFlex gap-3 xs:gap-4">
                    <FaStar className="size-5 text-foreground lg:size-6" />
                    <span className="text-xl font-medium text-foreground lg:text-2xl">
                      Average rating
                    </span>
                  </div>
                  {currentUser ? (
                    <motion.span
                      key={"averageTabRating"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-8 text-2xl font-semibold text-foreground lg:text-3xl"
                    >
                      {currentUser.totalTabRatings > 0
                        ? currentUser.averageTabRating.toFixed(1)
                        : "-"}
                    </motion.span>
                  ) : (
                    <motion.div
                      key={"averageTabRatingPlaceholder"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pulseAnimation ml-8 h-8 w-20 rounded-md bg-foreground/50 lg:h-9"
                    ></motion.div>
                  )}
                </div>

                <Separator
                  orientation="horizontal"
                  className="h-[1px] w-full bg-foreground/50"
                />

                <div className="baseFlex w-full !justify-between gap-2">
                  <div className="baseFlex gap-3 xs:gap-4">
                    <IoStatsChart className="size-5 text-foreground lg:size-6" />
                    <span className="text-xl font-medium text-foreground lg:text-2xl">
                      Total ratings
                    </span>
                  </div>
                  {currentUser ? (
                    <motion.span
                      key={"totalTabRatings"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-8 text-2xl font-semibold text-foreground lg:text-3xl"
                    >
                      {currentUser.totalTabRatings}
                    </motion.span>
                  ) : (
                    <motion.div
                      key={"totalTabRatingsPlaceholder"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pulseAnimation ml-8 h-8 w-20 rounded-md bg-foreground/50 lg:h-9"
                    ></motion.div>
                  )}
                </div>

                <Separator
                  orientation="horizontal"
                  className="h-[1px] w-full bg-foreground/50"
                />

                <div className="baseFlex w-full !justify-between gap-2">
                  <div className="baseFlex gap-3 xs:gap-4">
                    <IoBookmark className="size-5 text-foreground lg:size-6" />
                    <span className="text-xl font-medium text-foreground lg:text-2xl">
                      Total bookmarks
                    </span>
                  </div>
                  {currentUser ? (
                    <motion.span
                      key={"totalBookmarks"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-8 text-2xl font-semibold text-foreground lg:text-3xl"
                    >
                      {currentUser.totalBookmarksReceived}
                    </motion.span>
                  ) : (
                    <motion.div
                      key={"totalBookmarksPlaceholder"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pulseAnimation ml-8 h-8 w-20 rounded-md bg-foreground/50 lg:h-9"
                    ></motion.div>
                  )}
                </div>

                <Separator
                  orientation="horizontal"
                  className="h-[1px] w-full bg-foreground/50"
                />

                <div className="baseFlex w-full !justify-between gap-2">
                  <div className="baseFlex gap-3 xs:gap-4">
                    <IoCalendarOutline className="size-5 text-foreground lg:size-6" />
                    <span className="text-xl font-medium text-foreground lg:text-2xl">
                      Member since
                    </span>
                  </div>
                  {currentUser ? (
                    <motion.span
                      key={"memberSince"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-9 text-lg font-semibold text-foreground lg:text-xl"
                    >
                      {currentUser.createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: isAboveSmViewport ? "long" : "short",
                        day: "numeric",
                      })}
                    </motion.span>
                  ) : (
                    <motion.div
                      key={"memberSincePlaceholder"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pulseAnimation ml-9 h-6 w-28 rounded-md bg-foreground/50 lg:h-7 lg:w-40"
                    ></motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* top 5 tabs + misc stats tables*/}
            <div
              key={"topFiveStatsAndMiscStats"}
              className="baseVertFlex w-full !items-start gap-12 xl:w-1/2 xl:gap-0"
            >
              <div className="baseVertFlex w-full gap-2">
                <div className="baseVertFlex w-full gap-2">
                  <div className="baseFlex w-full !justify-start gap-3">
                    <FaTrophy className="size-5 text-foreground lg:size-6" />
                    <span className="text-xl font-semibold text-foreground lg:text-2xl">
                      Top 5
                    </span>
                  </div>
                  <Separator
                    orientation="horizontal"
                    className="h-[2px] w-full bg-foreground"
                  />
                </div>

                <div className="baseFlex relative w-full">
                  <Table>
                    <colgroup>
                      {/* Rank */}
                      <col className="w-[60px] sm:w-[100px]" />

                      {/* Title */}
                      <col className="w-auto" />

                      {/* Views/Bookmarks/Ratings */}
                      <col className="w-[90px] sm:w-[150px]" />
                    </colgroup>

                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-8 px-4 text-foreground/80">
                          Rank
                        </TableHead>
                        <TableHead className="h-8 px-4 text-foreground/80">
                          Title
                        </TableHead>
                        <TableHead className="h-8 px-4 text-foreground/80">
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
                                key={`rank-${rank}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="w-full"
                              >
                                <span className="font-semibold text-foreground">
                                  {rank}
                                </span>
                              </motion.div>
                            </TableCell>

                            <TableCell>
                              <motion.div
                                key={`title-${tab.id}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="w-full max-w-[230px] truncate sm:max-w-[300px]"
                              >
                                <Link
                                  href={`/tab/${tab.id}/${encodeURIComponent(tab.title)}`}
                                  className="!p-0 !text-base !font-semibold hover:underline md:!text-lg"
                                >
                                  {tab.title}
                                </Link>
                              </motion.div>
                            </TableCell>

                            <TableCell>
                              <motion.div
                                key={`value-${tab.id}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="w-full"
                              >
                                <span className="font-semibold text-foreground">
                                  {tab.value}
                                </span>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    </TableBody>
                  </Table>

                  <AnimatePresence mode="popLayout">
                    {(!currentUser ||
                      currentUser.totalTabs === 0 ||
                      isFetchingCurrentUser) && (
                      <motion.div
                        key={"topFiveStatsPlaceholder"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="baseVertFlex absolute left-0 top-8 h-[calc(100%-2rem)] w-full bg-black/65"
                      >
                        {!currentUser && (
                          <motion.div
                            key={"topFiveStatsSpinner"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <Spinner className="size-4 bg-transparent md:size-6" />
                          </motion.div>
                        )}

                        {currentUser && currentUser.totalTabs === 0 && (
                          <motion.div
                            key={"noTabsFound"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="baseVertFlex absolute left-0 top-0 size-full gap-2"
                          >
                            <Binoculars className="size-8 text-foreground md:size-10" />
                            <span className="text-xl font-semibold text-foreground md:text-2xl">
                              No tabs found
                            </span>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                    <IoIosArrowBack className="size-4 text-foreground" />
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
                    <IoIosArrowBack className="size-4 rotate-180 text-foreground" />
                  </Button>
                </div>
              </div>

              <div className="baseVertFlex w-full gap-2">
                <div className="baseVertFlex w-full gap-2">
                  <div className="baseFlex w-full !justify-start gap-3">
                    <IoDiceOutline className="size-5 text-foreground lg:size-6" />
                    <span className="text-xl font-semibold text-foreground lg:text-2xl">
                      Misc.
                    </span>
                  </div>
                  <Separator
                    orientation="horizontal"
                    className="h-[2px] w-full bg-foreground"
                  />
                </div>

                <div className="baseFlex w-full text-sm text-foreground/75">
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
                                  key={`${category}Category`}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="w-full"
                                >
                                  <span className="font-semibold text-foreground">
                                    {category}
                                  </span>
                                </motion.div>
                              </TableCell>

                              <TableCell>
                                <motion.div
                                  key={`${category}NumberOfTabs`}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="w-full"
                                >
                                  <span className="font-semibold text-foreground">
                                    {numberOfTabs}
                                  </span>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      </TableBody>
                    </Table>

                    <AnimatePresence mode="popLayout">
                      {(!currentUser ||
                        currentUser.totalTabs === 0 ||
                        isFetchingCurrentUser) && (
                        <motion.div
                          key={"miscStatsPlaceholder"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="baseVertFlex absolute left-0 top-0 size-full bg-black/65"
                        >
                          {!currentUser && (
                            <motion.div
                              key={"miscStatsPlaceholderSpinner"}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25 }}
                            >
                              <Spinner className="size-4 md:size-6" />
                            </motion.div>
                          )}

                          {currentUser && currentUser.totalTabs === 0 && (
                            <motion.div
                              key={"miscStatsNoTabsFound"}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="baseVertFlex absolute left-0 top-0 size-full gap-2"
                            >
                              <Binoculars className="size-8 text-foreground md:size-10" />
                              <span className="text-xl font-semibold text-foreground md:text-2xl">
                                No tabs found
                              </span>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                    <IoIosArrowBack className="size-4 text-foreground" />
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
                    <IoIosArrowBack className="size-4 rotate-180 text-foreground" />
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
