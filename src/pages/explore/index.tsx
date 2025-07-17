import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Head from "next/head";
import Image from "next/image";
import { useMemo } from "react";
import superjson from "superjson";
import { Separator } from "~/components/ui/separator";
import { api } from "~/utils/api";
import { PrismaClient, type User } from "@prisma/client";
import type { GetStaticProps } from "next";
import GuitarImage from "public/explore/header.jpg";
import GenreCards from "~/components/Explore/GenreCards";
import { FaRankingStar } from "react-icons/fa6";
import { IoFlash, IoStatsChart } from "react-icons/io5";
import { BsGridFill } from "react-icons/bs";
import type { MinimalTabRepresentation } from "~/server/api/routers/search";
import WeeklyFeaturedUsers from "~/components/Explore/WeeklyFeaturedUsers";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "~/components/ui/carousel";
import GridTabCard from "~/components/Search/GridTabCard";
import TabCardSkeleton from "~/components/Search/TabCardSkeleton";
import Link from "next/link";
import { Button } from "~/components/ui/button";

const LENGTH_FIFTEEN_ARRAY = Array.from({ length: 15 }, (_, i) => i + 1);

interface Explore {
  weeklyFeaturedUsers: (User & {
    pinnedTab: MinimalTabRepresentation | null;
  })[];
}

function Explore({ json }: { json: string }) {
  const { weeklyFeaturedUsers } = useMemo(
    () => superjson.parse<Explore>(json),
    [json],
  );

  const { userId } = useAuth();

  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  const { data: mostRecentAndPopularTabs } =
    api.search.getMostRecentAndPopularTabs.useQuery();

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
          <h1 className="baseFlex absolute left-6 top-8 text-3xl font-semibold tracking-tight text-primary-foreground md:left-8 md:top-14 md:text-4xl">
            Explore
          </h1>

          <Image
            src={GuitarImage}
            alt={"hi"}
            className="h-24 w-full rounded-lg object-cover object-top md:h-36 md:rounded-xl"
          />
        </div>

        <div className="baseVertFlex w-full !items-start !justify-start gap-8 border-y bg-muted p-4 shadow-lg md:rounded-xl md:border">
          {/* weekly featured users */}
          <div className="baseVertFlex w-full !items-start gap-4 p-1 md:p-4">
            <div className="baseVertFlex gap-0 md:gap-1">
              <div className="baseFlex gap-2">
                <FaRankingStar className="size-5 text-foreground md:size-6" />
                <span className="text-lg font-bold md:text-[1.35rem]">
                  Weekly featured users
                </span>
              </div>
              <Separator className="w-full bg-primary" />
            </div>

            <WeeklyFeaturedUsers
              weeklyFeaturedUsers={weeklyFeaturedUsers}
              currentUser={currentUser}
            />
          </div>

          {/* Newly added tabs carousel */}
          <div className="baseVertFlex w-full !items-start gap-4 p-1 md:p-4">
            <div className="baseFlex w-full !items-baseline !justify-between gap-2">
              <div className="baseVertFlex gap-0 md:gap-1">
                <div className="baseFlex gap-2">
                  <IoFlash className="size-4 text-foreground md:size-5" />
                  <span className="text-lg font-bold md:text-[1.35rem]">
                    Newly added tabs
                  </span>
                </div>
                <Separator className="w-full bg-primary" />
              </div>

              <Button variant={"link"} asChild>
                <Link
                  prefetch={false}
                  href={"/search/filters"}
                  className="!h-6 !py-0 text-foreground"
                >
                  View more
                </Link>
              </Button>
            </div>

            <Carousel
              opts={{
                dragFree: true,
              }}
              className="baseFlex w-full"
            >
              <CarouselContent className="pb-1">
                {LENGTH_FIFTEEN_ARRAY.map((_, index) => (
                  <CarouselItem key={index} className="basis-auto">
                    {mostRecentAndPopularTabs?.mostRecentTabs ? (
                      <GridTabCard
                        minimalTab={
                          mostRecentAndPopularTabs.mostRecentTabs[index]!
                        }
                        currentUser={currentUser}
                      />
                    ) : (
                      <TabCardSkeleton uniqueKey={`mostRecentTabs-${index}`} />
                    )}
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>

          {/* Most popular tabs carousel */}
          <div className="baseVertFlex w-full !items-start gap-4 p-1 md:p-4">
            <div className="baseFlex w-full !items-baseline !justify-between gap-2">
              <div className="baseVertFlex gap-0 md:gap-1">
                <div className="baseFlex gap-2">
                  <IoStatsChart className="size-4 text-foreground md:size-5" />
                  <span className="text-lg font-bold md:text-[1.35rem]">
                    Most popular tabs
                  </span>
                </div>
                <Separator className="w-full bg-primary" />
              </div>

              <Button variant={"link"} asChild>
                <Link
                  prefetch={false}
                  href={"/search/filters?sortBy=mostPopular"}
                  className="!h-6 !py-0 text-foreground"
                >
                  View more
                </Link>
              </Button>
            </div>

            <Carousel
              opts={{
                dragFree: true,
              }}
              className="baseFlex w-full"
            >
              <CarouselContent className="pb-1">
                {LENGTH_FIFTEEN_ARRAY.map((_, index) => (
                  <CarouselItem key={index} className="basis-auto">
                    {mostRecentAndPopularTabs?.mostPopularTabs ? (
                      <GridTabCard
                        minimalTab={
                          mostRecentAndPopularTabs.mostPopularTabs[index]!
                        }
                        currentUser={currentUser}
                      />
                    ) : (
                      <TabCardSkeleton uniqueKey={`mostPopularTabs-${index}`} />
                    )}
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>

          <div className="baseVertFlex w-full !items-start gap-4 p-1 md:p-4">
            <div className="baseVertFlex gap-0 md:gap-1">
              <div className="baseFlex gap-2">
                <BsGridFill className="size-4 text-foreground md:size-5" />
                <span className="text-lg font-bold md:text-[1.35rem]">
                  Genres
                </span>
              </div>
              <Separator className="w-full bg-primary" />
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

export const getStaticProps: GetStaticProps = async () => {
  const prisma = new PrismaClient();

  // get the five weekly featured users' userIds
  const featuredUserIds = await prisma.weeklyFeaturedUser.findMany({
    select: {
      userId: true,
    },
    take: 5,
  });

  // get the user data for the weekly featured users
  const featuredUsers = await prisma.user.findMany({
    where: {
      userId: {
        in: featuredUserIds.map((user) => user.userId),
      },
    },
  });

  const featuredUserPinnedTabIds = [];

  for (const user of featuredUsers) {
    // if the user has a pinned tab, add it to the array
    if (user.pinnedTabId) {
      featuredUserPinnedTabIds.push(user.pinnedTabId);
    }
  }

  // get each user's pinned tab
  const minimalPinnedTabs = await prisma.tab.findMany({
    where: {
      id: {
        in: featuredUserPinnedTabIds.map((id) => id),
      },
    },
    select: {
      id: true,
      title: true,
      genre: true,
      createdAt: true,
      difficulty: true,
      averageRating: true,
      ratingsCount: true,
      artist: {
        select: {
          id: true,
          name: true,
          isVerified: true,
        },
      },
      // do not need "createdBy" since we already have the user's full data
    },
  });

  // combine the user data with their pinned tabs
  const weeklyFeaturedUsers = featuredUsers.map((user) => {
    const pinnedTab = minimalPinnedTabs.find(
      (tab) => tab.id === user.pinnedTabId,
    );

    return {
      ...user,
      pinnedTab: pinnedTab || null, // if no pinned tab, set to null
    };
  });

  return {
    props: {
      json: superjson.stringify({
        weeklyFeaturedUsers,
      }),
    },
  };
};
