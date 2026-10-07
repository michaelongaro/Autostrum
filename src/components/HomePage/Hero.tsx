import Link from "next/link";
import { useEffect, useRef } from "react";
import HeaderLogo from "~/components/Header/HeaderLogo";
import { Button } from "~/components/ui/button";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

const HERO_FLATTEN_SCROLL_PX = 500;

function Hero() {
  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  return (
    <section className="baseVertFlex w-full max-w-[1700px] gap-12 overflow-x-clip px-4 md:gap-16 md:px-6 lg:px-8">
      <div className="baseVertFlex w-full max-w-2xl gap-5 text-center md:gap-6">
        <div className="baseVertFlex gap-3 md:gap-4">
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

        <div className="baseFlex gap-3">
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

      <TablatureScreenshot />
    </section>
  );
}

export default Hero;

import { ChevronDown, X } from "lucide-react";
import { CgArrowsShrinkH } from "react-icons/cg";
import CountIn from "~/components/ui/icons/CountIn";
import { IoColorPalette } from "react-icons/io5";
import { BsFillVolumeUpFill } from "react-icons/bs";
import TuningFork from "~/components/ui/icons/TuningFork";
import PlayIcon from "~/components/ui/icons/PlayIcon";
import { FaBook } from "react-icons/fa";
import { QuarterNote } from "~/utils/noteLengthIcons";

// Matches main's PLAYBACK_TAB_STRINGS_HEIGHT_PX (6 strings × 21px).
const PLAYBACK_TAB_STRINGS_HEIGHT_PX = 126;

// Visual-only recreation of main's <PlaybackTabChord> staff (no per-string
// bordered rows; 1px start/end staff lines; my-3 string spacing).
const TabColumn = ({
  left,
  strings,
  isHighlighted,
  isFirstChordInTab,
}: {
  left: number;
  strings: string[];
  isHighlighted: boolean;
  isFirstChordInTab?: boolean;
}) => (
  <div style={{ position: "absolute", width: 34, left }}>
    <div className="baseVertFlex relative w-[34px]">
      <div className="baseVertFlex w-full">
        <div className="baseVertFlex mb-[-18px]">
          <div className="baseFlex h-7 w-full"></div>

          <div className="baseVertFlex relative w-[34px]">
            {isFirstChordInTab && (
              <div
                className="absolute left-0 top-3 w-[1px] bg-foreground/50"
                style={{ height: PLAYBACK_TAB_STRINGS_HEIGHT_PX }}
              ></div>
            )}

            {strings.map((note, idx) => (
              <div
                key={idx}
                className="baseFlex relative w-[34px] basis-[content]"
              >
                <div className="h-[1px] flex-[1] bg-foreground/50"></div>
                <div className="baseFlex w-[34px]">
                  <div className="my-3 h-[1px] flex-[1] bg-foreground/50"></div>
                  <div
                    className="baseFlex relative h-[20px]"
                    style={{
                      color: isHighlighted
                        ? "hsl(var(--primary))"
                        : "hsl(var(--foreground))",
                    }}
                  >
                    <div>{note}</div>
                  </div>
                  <div className="my-3 h-[1px] flex-[1] bg-foreground/50"></div>
                </div>
                <div className="h-[1px] flex-[1] bg-foreground/50"></div>
              </div>
            ))}
          </div>

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

const HERO_SCREENSHOT_WIDTH_PX = 1152;
const HERO_SCREENSHOT_HEIGHT_PX = 650;

function getHeroScreenshotTilt(scrollY: number, narrow: boolean, fit: number) {
  const p = Math.min(scrollY / HERO_FLATTEN_SCROLL_PX, 1);
  const ease = 1 - p;
  const rotateX = (narrow ? 18 : 25) * ease;
  const rotateY = (narrow ? -4 : -8) * ease;
  const rotateZ = (narrow ? 2 : 4) * ease;
  const scale = (0.95 + 0.05 * p) * fit;

  return `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
}

function TablatureScreenshot() {
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tilt = tiltRef.current;
    if (!tilt) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrowQuery = window.matchMedia("(max-width: 767px)");

    const applyTilt = () => {
      const stage = tilt.closest(".heroScreenshotStage");
      const widthFit =
        (stage?.clientWidth ?? HERO_SCREENSHOT_WIDTH_PX) /
        HERO_SCREENSHOT_WIDTH_PX;
      const fit = Math.min(1, Math.max(widthFit, 0.52));

      if (stage instanceof HTMLElement) {
        if (fit < 1) {
          stage.style.height = `${HERO_SCREENSHOT_HEIGHT_PX * fit}px`;
          stage.style.overflow = "hidden";
        } else {
          stage.style.height = "";
          stage.style.overflow = "";
        }
      }

      if (motionQuery.matches) {
        tilt.style.transform = fit < 1 ? `scale(${fit})` : "none";
        return;
      }

      tilt.style.transform = getHeroScreenshotTilt(
        window.scrollY,
        narrowQuery.matches,
        fit,
      );
    };

    let frame = 0;
    const onScrollOrResize = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyTilt();
      });
    };

    applyTilt();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    motionQuery.addEventListener("change", applyTilt);
    narrowQuery.addEventListener("change", applyTilt);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      motionQuery.removeEventListener("change", applyTilt);
      narrowQuery.removeEventListener("change", applyTilt);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

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
      className="heroScreenshotStage -mb-8 w-full sm:-mb-12 md:-mb-24"
      aria-hidden="true"
    >
      <div ref={tiltRef} className="heroScreenshotTilt">
        <div className="heroScreenshotApp baseVertFlex playbackModalGradient pointer-events-none relative h-[650px] w-[1152px] max-w-none select-none !justify-between gap-0 overflow-hidden p-0">
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
                      <QuarterNote />
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

      {/* Tablature Track Section — desktop Practice view from main PlaybackModal */}
      <div className="baseVertFlex relative size-full select-none">
        <div className="w-full overflow-hidden">
          <div className="baseFlex relative h-[315px] w-full cursor-grab overflow-hidden">
            <div className="relative flex h-[315px] w-full overflow-hidden">
              <div className="baseFlex absolute left-0 top-0 size-full">
                <div className="h-[150px] w-full"></div>
                <div className="z-0 mb-[2px] ml-1 h-[124px] w-[2px] shrink-0 bg-primary"></div>
                <div className="h-[150px] w-full"></div>
              </div>

              <div
                className="relative flex items-center"
                style={{ width: tabData.length * 34 + 100 }}
              >
                {tabData.map((strings, idx) => (
                  <TabColumn
                    key={idx}
                    left={idx * 34}
                    strings={strings}
                    isHighlighted={idx < 16}
                    isFirstChordInTab={idx === 0}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="baseVertFlex w-full lg:gap-2">
        {/* Desktop (non-landscape) PlaybackAudioControls */}
        <div className="baseVertFlex w-full max-w-[85vw] gap-2 sm:max-w-[612px]">
          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                height: "8px",
                borderRadius: "4px",
                alignSelf: "center",
              }}
              className="relative w-full bg-[hsl(var(--gray)/0.5)]"
            >
              <div className="absolute left-0 top-0 h-full w-full overflow-hidden rounded-[4px]">
                <div
                  style={{ transform: "scaleX(0.33)" }}
                  className="absolute left-0 top-0 z-10 h-full w-full origin-left rounded-[4px] bg-primary"
                ></div>
              </div>
              <div
                style={{ left: "33%", top: "50%", transform: "translate(-50%, -50%)" }}
                className="!z-20 absolute size-[18px] rounded-full border border-foreground/50 bg-primary"
              ></div>
            </div>
          </div>

          <div className="baseFlex w-full !justify-between">
            <div className="baseFlex w-9 !justify-start self-start">0:04</div>

            <div className="baseFlex gap-6">
              <div className="baseFlex size-4 shrink-0 rounded-full bg-transparent p-0 text-sm">
                -5s
              </div>
              <div className="baseFlex size-10 shrink-0 overflow-hidden rounded-full border-none bg-transparent p-0 text-foreground">
                <PlayIcon
                  style={{
                    width: "1rem",
                    height: "1rem",
                  }}
                />
              </div>
              <div className="baseFlex size-4 shrink-0 rounded-full bg-transparent p-0 text-sm">
                +5s
              </div>
            </div>

            <div className="baseFlex w-9 !justify-end self-start">0:16</div>
          </div>
        </div>

        {/* Desktop PlaybackBottomMetadata settings row */}
        <div className="baseFlex w-full px-4 py-4">
          <div className="baseFlex w-full">
            <div className="baseFlex w-full !items-end gap-4">
              <div className="baseVertFlex !items-start gap-2">
                <div className="text-sm font-medium leading-none">
                  Instrument
                </div>
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
                <div className="text-sm font-medium leading-none">
                  Loop delay
                </div>
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

      <div className="baseFlex absolute right-4 top-4 !size-5 text-foreground opacity-70">
        <X className="size-5" />
        <span className="sr-only">Close</span>
      </div>
        </div>
      </div>
    </div>
  );
}
