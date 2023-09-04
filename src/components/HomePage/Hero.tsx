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

function Hero() {
  const { isSignedIn } = useAuth();

  const { data: fetchedTab, refetch: refetchTab } = api.tab.getTabById.useQuery(
    {
      id: 5,
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
          how you want them to sound.
        </p>

        <AnimatePresence mode="wait">
          {!isSignedIn && (
            <motion.div
              key={"homepageAuthContainer"}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="baseFlex mt-4 gap-4"
            >
              <SignUpButton
                mode="modal"
                afterSignUpUrl="http://localhost:3000/postSignUpRegistration"
              >
                <Button size={"lg"}>Sign up</Button>
              </SignUpButton>
              <SignInButton
                mode="modal"
                afterSignUpUrl="http://localhost:3000/postSignUpRegistration"
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
                height={isAboveMediumViewportWidth ? 180 : undefined}
              />
            ) : (
              <motion.div
                key={"homepageTabPlaceholder"}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="lightestGlassmorphic baseVertFlex rounded-md border-2"
              >
                <div
                  style={{
                    width: isAboveMediumViewportWidth ? 396.25 : 150,
                    height: isAboveMediumViewportWidth ? 180 : 100,
                  }}
                  className="animate-pulse rounded-t-sm bg-pink-300"
                ></div>

                <Separator />

                <div className="baseFlex w-full !items-end !justify-between">
                  {/* title, date, and genre */}
                  <div className="baseVertFlex mt-2 !items-start gap-2 pb-2 pl-2">
                    <div className="h-8 w-48 animate-pulse rounded-md bg-pink-300"></div>
                    <div className="h-6 w-16 animate-pulse rounded-md bg-pink-300"></div>
                    <div className="h-4 w-8 animate-pulse rounded-md bg-pink-300"></div>
                  </div>

                  {/* artist link & likes & play button */}
                  <div className="baseVertFlex gap-2">
                    <div className="baseFlex w-full !flex-nowrap !justify-evenly rounded-tl-md border-l-2 border-t-2">
                      {/* likes button */}
                      <div className="h-8 w-16 animate-pulse rounded-r-none rounded-bl-none rounded-tl-sm  bg-pink-300"></div>
                      <Separator className="h-8 w-[1px]" />

                      {/* play/pause button*/}
                      <div className="h-8 w-16 animate-pulse rounded-l-none rounded-br-sm rounded-tr-none  bg-pink-300"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default Hero;
