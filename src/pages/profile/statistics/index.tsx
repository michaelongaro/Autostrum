import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import { FaStar } from "react-icons/fa6";
import { IoStatsChart } from "react-icons/io5";
import { IoBookmark } from "react-icons/io5";
import { TbGuitarPick } from "react-icons/tb";
import { FaEye } from "react-icons/fa";
import Binoculars from "~/components/ui/icons/Binoculars";

const topFiveTabsPlaceholder = [0, 1, 2, 3, 4];

function UserStatistics() {
  const { userId } = useAuth();

  const { data: currentUser } = api.user.getStatistics.useQuery(userId!, {
    enabled: !!userId,
  });

  console.log(currentUser);

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
          <span className="ml-4 text-3xl font-semibold tracking-tight !text-pink-50 md:text-4xl">
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

        {/* just have ONE jsx return. w/ conditional states for skeleton and the actual values
          depending on if currentUser exists yet */}

        <div className="baseVertFlex lightGlassmorphic min-h-[calc(100dvh-4rem-6rem-56px)] w-full !items-start gap-4 rounded-lg px-4 md:min-h-[calc(100dvh-4rem-12rem-56px)] lg:!flex-row">
          <AnimatePresence mode="popLayout">
            {/* main stats */}
            <div className="baseVertFlex w-full !items-start gap-4 md:w-1/2">
              <div className="baseVertFlex !items-start gap-2">
                <div className="baseFlex gap-2">
                  <span className="text-xl font-medium text-pink-50 lg:text-2xl">
                    Total tabs
                  </span>

                  <TbGuitarPick className="size-5 text-pink-50 lg:size-6" />
                </div>
                {currentUser ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-2xl font-semibold text-pink-50 lg:text-3xl"
                  >
                    {currentUser.totalTabs}
                  </motion.span>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pulseAnimation h-5 w-8 rounded-md bg-pink-300"
                  ></motion.div>
                )}
              </div>

              <div className="baseVertFlex !items-start gap-2">
                <div className="baseFlex gap-2">
                  <span className="text-xl font-medium text-pink-50 lg:text-2xl">
                    Total tab views
                  </span>
                  <FaEye className="size-5 text-pink-50 lg:size-6" />
                </div>
                {currentUser ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-2xl font-semibold text-pink-50 lg:text-3xl"
                  >
                    {currentUser.totalTabViews}
                  </motion.span>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pulseAnimation h-5 w-8 rounded-md bg-pink-300"
                  ></motion.div>
                )}
              </div>

              <div className="baseVertFlex !items-start gap-2">
                <div className="baseFlex gap-2">
                  <span className="text-xl font-medium text-pink-50 lg:text-2xl">
                    Average rating
                  </span>

                  <FaStar className="size-5 text-pink-50 lg:size-6" />
                </div>
                {currentUser ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-2xl font-semibold text-pink-50 lg:text-3xl"
                  >
                    {currentUser.averageTabRating}
                  </motion.span>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pulseAnimation h-5 w-8 rounded-md bg-pink-300"
                  ></motion.div>
                )}
              </div>

              <div className="baseVertFlex !items-start gap-2">
                <div className="baseFlex gap-2">
                  <span className="text-xl font-medium text-pink-50 lg:text-2xl">
                    Total ratings
                  </span>

                  <IoStatsChart className="size-5 text-pink-50 lg:size-6" />
                </div>
                {currentUser ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-2xl font-semibold text-pink-50 lg:text-3xl"
                  >
                    {currentUser.totalTabRatings}
                  </motion.span>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pulseAnimation h-5 w-8 rounded-md bg-pink-300"
                  ></motion.div>
                )}
              </div>

              <div className="baseVertFlex !items-start gap-2">
                <div className="baseFlex gap-2">
                  <span className="text-xl font-medium text-pink-50 lg:text-2xl">
                    Total bookmarks received
                  </span>

                  <IoBookmark className="size-5 text-pink-50 lg:size-6" />
                </div>
                {currentUser ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-2xl font-semibold text-pink-50 lg:text-3xl"
                  >
                    {currentUser.totalBookmarksReceived}
                  </motion.span>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pulseAnimation h-5 w-8 rounded-md bg-pink-300"
                  ></motion.div>
                )}
              </div>
            </div>

            {/* top 5 most popular tabs */}
            <div className="baseVertFlex w-full !items-start gap-2 md:w-1/2">
              <div className="baseFlex gap-2">
                <span className="text-xl font-medium text-pink-50 lg:text-2xl">
                  Your most viewed tabs
                </span>

                <TbGuitarPick className="size-5 text-pink-50 lg:size-6" />
              </div>

              <Table>
                {currentUser?.topViewedTabs.length !== 0 && (
                  <colgroup>
                    {/* Rank */}
                    <col className="w-[24px]" />

                    {/* Title */}
                    <col className="w-auto sm:!w-[314.53px]" />

                    {/* Views */}

                    <col className="w-[70px]" />
                  </colgroup>
                )}

                <TableBody className="w-full">
                  {currentUser ? (
                    <>
                      {currentUser.topViewedTabs.length > 0 ? (
                        <>
                          {currentUser.topViewedTabs.map((tab, idx) => (
                            <TableRow key={tab.id} className="w-full">
                              <TableCell>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="w-full"
                                >
                                  <span className="text-2xl font-semibold text-pink-50">
                                    {idx + 1}
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
                                  <span className="text-2xl font-semibold text-pink-50">
                                    {tab.pageViews}
                                  </span>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ) : (
                        <TableRow className="w-full">
                          <TableCell>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="baseVertFlex w-full gap-2"
                            >
                              <Binoculars className="size-5 text-pink-50" />
                              <span className="text-2xl font-semibold text-pink-50">
                                No tabs found
                              </span>
                            </motion.div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ) : (
                    <>
                      {topFiveTabsPlaceholder.map((idx) => (
                        <TableRow key={idx} className="w-full">
                          <TableCell>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="w-full"
                            >
                              <span className="text-2xl font-semibold text-pink-50">
                                {idx + 1}
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
                              <span className="pulseAnimation h-5 w-36 rounded-md bg-pink-300"></span>
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
                              <span className="pulseAnimation h-5 w-8 rounded-md bg-pink-300"></span>
                            </motion.div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default UserStatistics;
