import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { api } from "~/utils/api";
import { GiMusicalScore } from "react-icons/gi";
import { HiOutlineLightBulb } from "react-icons/hi";
import { BsBarChartLine } from "react-icons/bs";
import { Button } from "~/components/ui/button";
import GridTabCard from "../Search/GridTabCard";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { AnimatePresence, motion } from "framer-motion";
import { Separator } from "../ui/separator";
import TabCardSkeleton from "../Search/TabCardSkeleton";

function Hero() {
  const { isSignedIn, isLoaded } = useAuth();

  const { data: fetchedTab, refetch: refetchTab } = api.tab.getTabById.useQuery(
    {
      id: 22,
    }
  );

  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  return (
    <div className="baseVertFlex z-10 my-24 !flex-nowrap gap-16 xl:flex-row">
      <div className="lightGlassmorphic baseVertFlex w-5/6 items-start gap-4 rounded-xl p-4 shadow-sm sm:w-auto md:p-8">
        <h1 className="baseVertFlex gap-2 text-3xl font-bold md:text-5xl">
          Welcome to
          <Image
            src="/logoWithTitle.svg"
            alt="Autostrum logo"
            width={isAboveMediumViewportWidth ? 300 : 200}
            height={isAboveMediumViewportWidth ? 100 : 75}
            priority
          />
        </h1>

        <p className="text-center text-sm md:text-base">
          Create and share your riffs{" "}
          <span className="italic text-pink-600 underline underline-offset-2">
            exactly
          </span>{" "}
          how you want them to sound
        </p>

        <AnimatePresence mode="wait">
          {!isLoaded && (
            <motion.div
              key={"homepageAuthSkeletonContainer"}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="baseFlex mt-4 gap-4"
            >
              <div className="h-[44px] w-[114px] animate-pulse rounded-md bg-pink-300"></div>
              <div
                className={`h-[44px] ${
                  isAboveMediumViewportWidth ? "w-[81px]" : "w-[73px]"
                } animate-pulse rounded-md bg-pink-300`}
              ></div>
            </motion.div>
          )}

          {isLoaded && !isSignedIn && (
            <motion.div
              key={"homepageAuthContainer"}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="baseFlex mt-4 gap-4"
            >
              <SignUpButton
                mode="modal"
                afterSignUpUrl={`${
                  process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                }/postSignUpRegistration`}
              >
                <Button size={"lg"}>Sign up</Button>
              </SignUpButton>
              <SignInButton
                mode="modal"
                afterSignUpUrl={`${
                  process.env.NEXT_PUBLIC_DOMAIN_URL ?? ""
                }/postSignUpRegistration`}
              >
                <Button variant={"secondary"} className="h-11">
                  Sign in
                </Button>
              </SignInButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="baseVertFlex lightGlassmorphic w-4/5 gap-4 rounded-xl p-4 shadow-sm md:max-w-[550px] md:p-8">
        <div className="baseFlex !flex-nowrap gap-4">
          <div className="lightestGlassmorphic rounded-md p-2">
            <GiMusicalScore className="h-8 w-8" />
          </div>
          <div className="baseVertFlex !items-start gap-1">
            <p className="text-lg font-bold md:text-xl">Compose</p>
            <p className="text-sm md:text-base">
              Craft intricate guitar tabs with our advanced editor, complete
              with strumming patterns, keyboard navigation, and more.
            </p>
          </div>
        </div>

        <div className="baseFlex !flex-nowrap gap-4">
          <div className="lightestGlassmorphic rounded-md p-2">
            <HiOutlineLightBulb className="h-8 w-8" />
          </div>
          <div className="baseVertFlex !items-start gap-1">
            <p className="text-lg font-bold md:text-xl">Find inspiration</p>
            <p className="text-sm md:text-base">
              Explore an ever growing library of tabs and discover new talents
              in our weekly featured artist section.
            </p>
          </div>
        </div>

        <div className="baseFlex !flex-nowrap gap-4">
          <div className="lightestGlassmorphic rounded-md p-2">
            <BsBarChartLine className="h-8 w-8" />
          </div>
          <div className="baseVertFlex !items-start gap-1">
            <p className="text-lg font-bold md:text-xl">Practice</p>
            <p className="text-sm md:text-base">
              Hear your tabs come to life with true-to-life audio playback,
              customizable speed playback, and artist-recorded audio guides.
            </p>
          </div>
        </div>

        <div className="baseFlex mt-4 w-full">
          <AnimatePresence mode="wait">
            {fetchedTab ? (
              <GridTabCard
                tab={fetchedTab}
                refetchTab={refetchTab}
                width={isAboveMediumViewportWidth ? 396.25 : undefined}
              />
            ) : (
              <TabCardSkeleton
                key={"homepageTabCardSkeleton"}
                width={isAboveMediumViewportWidth ? 396.25 : 150}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default Hero;
