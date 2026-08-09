import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import HeaderLogo from "~/components/Header/HeaderLogo";
import { Button } from "~/components/ui/button";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { api } from "~/utils/api";
import mobileHero from "public/homepage/hero/goodMobileHero.png";
import desktopHero from "public/homepage/hero/goodDesktopHero.png";

const PROMOTED_TAB_ID = 83;

function Hero() {
  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const { data: promotedTab, isFetched: promotedTabFetched } =
    api.search.getMinimalTabById.useQuery(PROMOTED_TAB_ID);

  const { data: fallbackTabs } =
    api.search.getMostRecentAndPopularTabs.useQuery(undefined, {
      enabled: promotedTabFetched && !promotedTab,
    });

  return (
    <section className="baseVertFlex w-full max-w-[1200px] gap-8 px-4 md:gap-10 md:px-6 lg:px-8">
      <div className="baseVertFlex w-full gap-8 lg:flex-row lg:!items-center lg:!justify-between lg:gap-0">
        <div className="baseVertFlex w-full max-w-xl !items-start gap-5 md:gap-6">
          <div className="baseVertFlex !items-start gap-3 md:gap-4">
            <h1 className="sr-only">Autostrum</h1>
            <HeaderLogo
              width={isAboveMediumViewportWidth ? 320 : 220}
              height={isAboveMediumViewportWidth ? 56 : 38}
            />
            <p className="max-w-lg text-xl font-semibold tracking-tight md:text-2xl lg:text-[1.75rem]">
              Create and share your riffs{" "}
              <span className="italic text-primary underline underline-offset-2">
                exactly
              </span>{" "}
              how you want them to sound
            </p>
            <p className="max-w-md text-sm text-foreground/80 md:text-base">
              Keyboard-first editor, realistic guitar playback, and tools to
              practice what you write.
            </p>
          </div>

          <div className="baseFlex !justify-start gap-3">
            <Button asChild className="px-5 md:px-6">
              <Link prefetch={false} href="/create">
                Create a tab
              </Link>
            </Button>
            <Button variant="outline" asChild className="px-5 md:px-6">
              <Link prefetch={false} href="/explore">
                Explore tabs
              </Link>
            </Button>
          </div>
        </div>

        {/* <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="w-full max-w-md lg:max-w-4xl"
        >
          <Image
            alt={"practice modal preview"}
            src={isAboveMediumViewportWidth ? desktopHero : mobileHero}
            className="rounded-lg border shadow-lg"
            priority
          />
        </motion.div> */}

        <TablatureScreenshot />
      </div>
    </section>
  );
}

export default Hero;

import { ChevronDown } from "lucide-react";
import { CgArrowsShrinkH } from "react-icons/cg";
import CountIn from "~/components/ui/icons/CountIn";
import { IoColorPalette } from "react-icons/io5";
import { BsFillVolumeUpFill } from "react-icons/bs";
import TuningFork from "~/components/ui/icons/TuningFork";
import { FaBook } from "react-icons/fa";

// Helper component to render the repetitive tab column sections cleanly
const TabColumn = ({ left, strings }: { left: number; strings: string[] }) => (
  <div style={{ position: "absolute", width: 34, left }}>
    <div className="baseVertFlex relative w-[34px]">
      <div className="baseVertFlex w-full">
        <div className="baseVertFlex mb-[-18px]">
          <div className="baseFlex h-7 w-full"></div>
          {strings.map((note, idx) => (
            <div
              key={idx}
              className="baseFlex headerModalGradient relative w-[34px] basis-[content]"
              style={{
                borderWidth:
                  idx === 0
                    ? "2px medium medium"
                    : idx === 5
                      ? "medium medium 2px"
                      : "medium",
                borderStyle:
                  idx === 0
                    ? "solid none none"
                    : idx === 5
                      ? "none none solid"
                      : "none",
                borderColor: "currentColor",
                paddingTop: idx === 0 ? 7 : 0,
                paddingBottom: idx === 5 ? 7 : 0,
              }}
            >
              <div className="h-[1px] flex-[1] bg-foreground/50"></div>
              <div className="baseFlex w-[34px]">
                <div className="my-[10px] h-[1px] flex-[1] bg-foreground/50 mobilePortrait:my-3"></div>
                <div
                  className="baseFlex relative h-[20px]"
                  style={{
                    color: "hsl(var(--primary))",
                    marginTop: 0,
                    marginBottom: 0,
                  }}
                >
                  <div>{note}</div>
                </div>
                <div className="my-[10px] h-[1px] flex-[1] bg-foreground/50 mobilePortrait:my-3"></div>
              </div>
              <div className="h-[1px] flex-[1] bg-foreground/50"></div>
            </div>
          ))}
          <div className="baseFlex mt-1 h-4 w-full">
            <div className="baseFlex relative size-full !flex-nowrap">
              <div
                className="h-full w-[1px] rounded-md"
                style={{ backgroundColor: "currentColor" }}
              ></div>
            </div>
          </div>
          <div className="baseFlex relative mt-2 size-5">
            <div className="size-full"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

function TablatureScreenshot() {
  // Simplified tab data without hardcoded absolute left values
  const tabData = [
    ["", "3", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "0", "", "", ""],
    ["", "", "", "0", "", ""],
    ["", "", "0", "", "", ""],
    ["", "", "", "", "", "0"],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", "0"],
    ["", "0", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "0", "", "", ""],
    ["", "", "", "2", "", ""],
    ["", "", "0", "", "", ""],
    ["", "", "", "0", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "", "0", "", ""],
    ["", "3", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "3", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "0", "", "", ""],
    ["", "", "", "0", "", ""],
    ["", "", "0", "", "", ""],
    ["", "", "", "", "", "0"],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", "0"],
    ["", "0", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "3", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "0", "", "", ""],
    ["", "", "", "0", "", ""],
    ["", "", "0", "", "", ""],
    ["", "", "", "", "", "0"],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", "0"],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "3", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["", "", "0", "", "", ""],
    ["", "", "", "0", "", ""],
    ["", "", "0", "", "", ""],
    ["", "", "", "", "", "0"],
    ["", "", "", "", "", ""],
    ["", "", "", "", "", "0"],
  ];

  return (
    <div
      style={{
        // transform: "scale(0.75)",
        // zoom: 0.5,
        transform: "rotate3d(1,1,1,0.45)",
      }}
      className="baseVertFlex playbackModalGradient pointer-events-none relative h-[650px] w-screen max-w-none select-none !justify-between gap-0 overflow-hidden !rounded-none border p-0 tablet:max-w-6xl tablet:!rounded-lg"
    >
      {/* Top Header Section */}
      <div className="baseFlex mt-4 w-full !items-end !justify-between gap-2 px-4">
        <div className="baseFlex w-full !items-end !justify-start gap-2">
          <div className="baseVertFlex w-full !items-start gap-2">
            <div className="baseFlex !justify-start gap-4">
              <div className="baseFlex w-full !justify-start">
                <div className="size-full max-w-[80vw] tablet:max-w-[600px]">
                  <div style={{ padding: 0 }}>
                    <span className="whitespace-nowrap text-xl font-bold tablet:text-2xl">
                      Good Riddance
                    </span>
                  </div>
                </div>
              </div>
              <div className="baseFlex gap-4">
                <div className="h-6 w-[1px] shrink-0 rounded-full bg-foreground/50"></div>
                <div className="baseFlex gap-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="sectionPicker"
                  >
                    Section
                  </label>
                  <div
                    className="border-input flex !h-9 w-full !max-w-32 items-center justify-between gap-2 rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm ring-offset-background placeholder:text-foreground/75 mobilePortrait:!h-8 mobilePortrait:!max-w-none"
                    id="sectionPicker"
                  >
                    <p className="truncate">Full tab</p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4 shrink-0 opacity-50"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="baseFlex w-full !justify-between gap-4">
              <div className="baseVertFlex w-full !items-start gap-4 md:!flex-row md:!items-center md:!justify-start">
                <div className="baseFlex gap-4">
                  <div className="baseVertFlex !items-start text-nowrap">
                    <span className="text-sm font-medium">Tempo</span>
                    <div className="baseFlex w-[79px] !justify-start gap-1">
                      350 BPM
                    </div>
                  </div>

                  <div className="baseVertFlex !items-start">
                    <span className="text-sm font-medium">Tuning</span>
                    <div>Standard</div>
                  </div>

                  <div className="baseVertFlex !items-start">
                    <span className="text-sm font-medium">Capo</span>
                    None
                  </div>

                  <div className="inline-flex h-9 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                    <TuningFork className="size-4" />
                    Tuner
                  </div>

                  <div className="inline-flex size-10 items-center justify-center rounded-md border text-sm font-medium text-foreground shadow-sm">
                    <FaBook className="size-4" />
                  </div>
                </div>
              </div>
              <div className="baseFlex w-full max-w-none">
                <div className="baseFlex gap-0">
                  <div className="relative inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium">
                    <span className="absolute bottom-[4px] left-4 z-0 h-[2px] w-[54px] rounded-full bg-primary"></span>
                    Practice
                  </div>
                  <div className="relative inline-flex h-10 items-center justify-center text-nowrap rounded-md px-4 py-2 text-sm font-medium">
                    Section progression
                  </div>
                  <div className="relative inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium">
                    Chords
                  </div>
                  <div className="relative inline-flex h-10 items-center justify-center text-nowrap rounded-md px-4 py-2 text-sm font-medium">
                    Strumming patterns
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tablature Track Section */}
      <div
        className="baseVertFlex relative size-full select-none"
        style={{ opacity: 1 }}
      >
        <div className="w-full overflow-hidden">
          <div className="baseFlex relative h-[255px] w-full overflow-hidden mobilePortrait:h-[315px]">
            <div className="relative flex h-[255px] w-full overflow-hidden mobilePortrait:h-[315px]">
              <div className="baseFlex absolute left-0 top-0 size-full">
                <div className="h-[140px] w-full mobilePortrait:h-[165px]"></div>
                {/* Playback Cursor Line */}
                <div className="z-0 ml-1 h-[140px] w-[2px] shrink-0 bg-primary mobilePortrait:h-[165px]"></div>
                <div className="h-[140px] w-full mobilePortrait:h-[165px]"></div>
              </div>

              {/* Removed transform: translateX() and dynamically calculating container width */}
              <div
                className="relative flex items-center"
                style={{ width: tabData.length * 34 + 100 }}
              >
                {/* Dynamically calculate left position via idx * 34 */}
                {tabData.map((strings, idx) => (
                  <TabColumn key={idx} left={idx * 34} strings={strings} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Row */}
      <div className="baseFlex w-full px-4 py-4">
        <div className="baseFlex w-full">
          <div className="baseFlex w-full !items-end gap-4">
            <div className="baseVertFlex !items-start gap-2">
              <div className="text-sm font-medium leading-none">Instrument</div>
              <div className="border-input flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm">
                Acoustic guitar - Steel
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </div>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <div className="text-sm font-medium leading-none">Speed</div>
              <div className="border-input flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm">
                1x
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </div>
            </div>

            <div className="baseVertFlex !items-start gap-2">
              <div className="text-sm font-medium leading-none">Loop delay</div>
              <div className="border-input flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm">
                0s
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </div>
            </div>

            <div className="inline-flex size-10 items-center justify-center rounded-md border text-sm font-medium text-foreground shadow-sm">
              <CgArrowsShrinkH className="size-6" />
            </div>

            <div className="inline-flex size-10 items-center justify-center rounded-md border text-sm font-medium text-foreground shadow-sm">
              <CountIn className="size-5" />
            </div>

            <div className="inline-flex size-10 items-center justify-center rounded-md border text-sm font-medium text-foreground shadow-sm">
              <IoColorPalette className="size-5" />
            </div>

            <div className="inline-flex size-10 items-center justify-center rounded-md border text-sm font-medium text-foreground shadow-sm">
              <BsFillVolumeUpFill size={"1.5rem"} className="shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
