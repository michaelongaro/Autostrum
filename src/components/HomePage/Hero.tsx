import { useAuth } from "@clerk/nextjs";
import { AnimatePresence } from "framer-motion";
import Image from "next/image";
import { BsBarChartLine } from "react-icons/bs";
import { GiMusicalScore } from "react-icons/gi";
import { HiOutlineLightBulb } from "react-icons/hi";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { api } from "~/utils/api";
import GridTabCard from "../Search/GridTabCard";
import TabCardSkeleton from "../Search/TabCardSkeleton";
import classes from "./Hero.module.css";

function Hero() {
  const { userId } = useAuth();

  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  const { data: fetchedTab } = api.search.getMinimalTabById.useQuery(83);

  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);
  const isAboveExtraLargeViewportWidth = useViewportWidthBreakpoint(1280);

  return (
    <div className="baseVertFlex z-10 my-24 !flex-nowrap gap-16 md:gap-24">
      <div className="homepageLightGlassmorphic baseVertFlex w-5/6 items-start gap-2 rounded-xl p-4 shadow-sm sm:w-auto md:gap-4 md:p-8">
        <div className="baseVertFlex gap-4">
          <h1 className="baseVertFlex gap-2 text-3xl font-bold md:text-5xl">
            Welcome to
            <Image
              src="/logoWithTitle.svg"
              alt="Autostrum logo"
              style={{
                filter: "drop-shadow(0px 1px 0.5px hsla(336, 84%, 17%, 0.25))",
              }}
              width={isAboveMediumViewportWidth ? 300 : 200}
              height={isAboveMediumViewportWidth ? 100 : 75}
              priority
            />
          </h1>

          <p className="text-center text-base md:text-lg">
            Create and share your riffs{" "}
            <span
              className={`${
                classes.exactlySpanShadow ?? ""
              } mx-[1px] italic text-pink-600 underline underline-offset-2`}
            >
              exactly
            </span>{" "}
            how you want them to sound
          </p>
        </div>
      </div>

      <div className="baseVertFlex homepageLightGlassmorphic w-11/12 !flex-nowrap gap-8 rounded-xl p-4 shadow-sm sm:w-4/5 md:max-w-[550px] md:gap-4 md:p-8 xl:w-[950px] xl:max-w-[950px]">
        <div className="baseVertFlex !flex-nowrap gap-8 xl:flex-row xl:gap-12">
          {/* ideally would try to be smarter about mobile vs desktop styles/org rather than repeat
              myself twice here */}
          {isAboveExtraLargeViewportWidth ? (
            <div className="baseFlex !flex-nowrap gap-3 xl:flex-col xl:!items-start">
              <div className="baseFlex w-full !justify-start gap-2">
                <div className="lightestGlassmorphic mr-2 shrink-0 rounded-md p-2">
                  <GiMusicalScore className="h-8 w-8" />
                </div>
                <p className="text-lg font-bold md:text-xl">Compose</p>
              </div>
              <div className="baseVertFlex !items-start gap-1">
                <p className="text-sm md:text-base xl:h-[125px] xl:w-[250px]">
                  Craft intricate guitar tabs with our advanced editor, complete
                  with strumming patterns, keyboard navigation, and more!
                </p>
              </div>
            </div>
          ) : (
            <div className="baseFlex !flex-nowrap gap-4 xl:flex-col xl:!items-start">
              <div className="lightestGlassmorphic shrink-0 rounded-md p-2">
                <GiMusicalScore className="h-8 w-8" />
              </div>
              <div className="baseVertFlex !items-start gap-1">
                <p className="text-lg font-bold md:text-xl">Compose</p>
                <p className="text-sm md:text-base xl:h-[125px] xl:w-[250px]">
                  Craft intricate guitar tabs with our advanced editor, complete
                  with strumming patterns, keyboard navigation, and more!
                </p>
              </div>
            </div>
          )}

          {isAboveExtraLargeViewportWidth ? (
            <div className="baseFlex !flex-nowrap gap-3 xl:flex-col xl:!items-start">
              <div className="baseFlex w-full !justify-start gap-2">
                <div className="lightestGlassmorphic mr-2 shrink-0 rounded-md p-2">
                  <HiOutlineLightBulb className="h-8 w-8" />
                </div>
                <p className="text-lg font-bold md:text-xl">Find inspiration</p>
              </div>
              <div className="baseVertFlex !items-start gap-1">
                <p className="text-sm md:text-base xl:h-[125px] xl:w-[250px]">
                  Explore an ever growing library of tabs and discover new
                  talents in our weekly featured artist section.
                </p>
              </div>
            </div>
          ) : (
            <div className="baseFlex !flex-nowrap gap-4 xl:flex-col xl:!items-start">
              <div className="lightestGlassmorphic shrink-0 rounded-md p-2">
                <HiOutlineLightBulb className="h-8 w-8" />
              </div>
              <div className="baseVertFlex !items-start gap-1">
                <p className="text-lg font-bold md:text-xl">Find inspiration</p>
                <p className="text-sm md:text-base xl:h-[125px] xl:w-[250px]">
                  Explore an ever growing library of tabs and discover new
                  talents in our weekly featured artist section.
                </p>
              </div>
            </div>
          )}

          {isAboveExtraLargeViewportWidth ? (
            <div className="baseFlex !flex-nowrap gap-3 xl:flex-col xl:!items-start">
              <div className="baseFlex w-full !justify-start gap-2">
                <div className="lightestGlassmorphic mr-2 shrink-0 rounded-md p-2">
                  <BsBarChartLine className="h-8 w-8" />
                </div>
                <p className="text-lg font-bold md:text-xl">Practice</p>
              </div>
              <div className="baseVertFlex !items-start gap-1">
                <p className="text-sm md:text-base xl:h-[125px] xl:w-[250px]">
                  Play along with any tab, varying the playback speed,
                  instrument, or choose to practice sections of the tab at a
                  time.
                </p>
              </div>
            </div>
          ) : (
            <div className="baseFlex !flex-nowrap gap-4 xl:flex-col xl:!items-start">
              <div className="lightestGlassmorphic shrink-0 rounded-md p-2">
                <BsBarChartLine className="h-8 w-8" />
              </div>
              <div className="baseVertFlex !items-start gap-1">
                <p className="text-lg font-bold md:text-xl">Practice</p>
                <p className="text-sm md:text-base xl:h-[125px] xl:w-[250px]">
                  Play along with any tab, varying the playback speed,
                  instrument, or choose to practice sections of the tab at a
                  time.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="baseFlex my-4 w-full">
          <AnimatePresence mode="sync">
            {fetchedTab ? (
              <GridTabCard
                minimalTab={fetchedTab}
                currentUser={currentUser}
                largeVariant={isAboveMediumViewportWidth}
              />
            ) : (
              <TabCardSkeleton
                uniqueKey={"homepageTabCardSkeleton"}
                largeVariant={isAboveMediumViewportWidth}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default Hero;
