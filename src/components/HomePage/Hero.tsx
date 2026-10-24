import Link from "next/link";
import HeaderLogo from "~/components/Header/HeaderLogo";
import { Button } from "~/components/ui/button";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

function Hero() {
  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  return (
    <section className="baseVertFlex min-h-[calc(100svh-4rem-0rem)] w-full max-w-[1700px] overflow-x-clip px-4 md:min-h-[calc(100svh-4rem-6rem)] md:px-6 lg:px-8">
      <div className="baseVertFlex w-full gap-16 lg:flex-row lg:!items-center lg:!justify-between lg:gap-10">
        <div className="baseVertFlex w-full max-w-xl shrink-0 gap-5 md:!items-start md:gap-6">
          <div className="baseVertFlex gap-3 md:!items-start md:gap-4">
            <h1 className="sr-only">Autostrum</h1>
            <HeaderLogo
              width={isAboveMediumViewportWidth ? 320 : 220}
              height={isAboveMediumViewportWidth ? 56 : 38}
            />
            <p className="max-w-lg text-center text-xl font-semibold tracking-tight md:text-left md:text-2xl lg:text-[1.75rem]">
              Find your next favorite song to play.
            </p>
            <p className="max-w-sm text-center text-sm text-foreground/80 md:text-left md:text-base">
              Discover guitar tabs, hear how they sound, and learn at your own
              pace.
            </p>
          </div>

          <div className="baseFlex !justify-start gap-3">
            <Button asChild className="px-5 md:px-6">
              <Link prefetch={false} href="/explore">
                Explore tabs
              </Link>
            </Button>
            <Button variant="outline" asChild className="px-5 md:px-6">
              <Link prefetch={false} href="/create">
                Create a tab
              </Link>
            </Button>
          </div>
        </div>

        <MobileTablatureScreenshot />
        <TablatureScreenshot />
      </div>
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
import { FaBook, FaListUl } from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
import { PiMetronome } from "react-icons/pi";
import { QuarterNote } from "~/utils/noteLengthIcons";

const HERO_PLAYBACK_PROGRESS = 23 / (4 * 60 + 12);
const HERO_PLAYBACK_PROGRESS_PERCENT = `${HERO_PLAYBACK_PROGRESS * 100}%`;

// Use em units so both previews share the same staff at their viewport scale.
const TAB_COLUMN_WIDTH = 2.125;

// Visual-only recreation of main's <PlaybackTabChord> staff (no per-string
// bordered rows; 1px start/end staff lines; my-3 string spacing).
const TabColumn = ({
  left,
  strings,
  beamCount,
  startsBeam,
  endsBeam,
  startsMeasure,
}: {
  left: string;
  strings: string[];
  beamCount: number;
  startsBeam: boolean;
  endsBeam: boolean;
  startsMeasure: boolean;
}) => (
  <div style={{ position: "absolute", width: "2.125em", left }}>
    <div className="baseVertFlex relative w-[2.125em]">
      <div className="baseVertFlex w-full">
        <div className="baseVertFlex mb-[-1.125em]">
          <div className="baseFlex h-[1.75em] w-full"></div>

          <div className="baseVertFlex relative w-[2.125em]">
            {startsMeasure && (
              <div className="absolute left-0 top-[0.75em] h-[7.875em] w-[0.0625em] bg-foreground/50" />
            )}
            {strings.map((note, idx) => (
              <div
                key={idx}
                className="baseFlex relative w-[2.125em] basis-[content]"
              >
                <div className="h-[0.0625em] flex-[1] bg-foreground/50"></div>
                <div className="baseFlex w-[2.125em]">
                  <div className="my-[0.75em] h-[0.0625em] flex-[1] bg-foreground/50"></div>
                  <div className="baseFlex relative h-[1.25em]">
                    <div>{note}</div>
                  </div>
                  <div className="my-[0.75em] h-[0.0625em] flex-[1] bg-foreground/50"></div>
                </div>
                <div className="h-[0.0625em] flex-[1] bg-foreground/50"></div>
              </div>
            ))}
          </div>

          <div className="baseFlex mt-[0.25em] h-[1em] w-full text-foreground">
            <div className="relative size-full">
              <div className="absolute left-1/2 h-full w-[0.0625em] bg-current" />
              {Array.from({ length: beamCount }, (_, idx) => (
                <div
                  key={idx}
                  className="absolute h-[0.125em] bg-current"
                  style={{
                    bottom: `${idx * 0.25}em`,
                    left: startsBeam ? "50%" : 0,
                    right: endsBeam ? "calc(50% - 0.0625em)" : 0,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="baseFlex relative mt-[0.5em] size-[1.25em]">
            <div className="size-full"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Let Her Go, transcribed top string to bottom string from the reference.
// Both desktop and mobile landscape previews share the same notes and rhythm.
const tabData = [
  ["", "", "0h", "", "", ""],
  ["", "", "2", "", "", ""],
  ["", "1", "", "3", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", "1"],
  ["", "", "2", "", "", ""],
  ["", "", "", "3", "", ""],
  ["3", "", "", "", "", ""],
  ["", "", "", "", "", "1"],
  ["0", "", "", "", "", ""],
  ["", "", "", "3", "", ""],
  ["", "1", "", "", "", ""],
  ["", "", "", "", "", "3"],
  ["", "3", "", "", "", ""],
  ["", "", "", "0", "", ""],
  ["0", "", "", "", "", ""],
  ["", "", "", "", "0", ""],
  ["", "", "", "2", "", ""],
  ["", "", "", "", "0", ""],
  ["", "", "2", "", "", ""],
  ["", "", "", "2", "", ""],
  ["", "1", "", "", "", ""],
  ["", "", "", "", "0", ""],
  ["", "", "", "2", "", ""],
  ["", "3", "", "", "", "3"],
  ["0", "", "", "", "", ""],
  ["", "3", "", "0", "", ""],
  ["", "1", "", "", "", ""],
  ["", "", "0h", "", "", "1"],
  ["", "", "2", "", "", ""],
  ["", "1", "", "3", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", "1"],
  ["", "", "2", "", "", ""],
  ["", "", "", "3", "", ""],
];

const beamGroups = [
  [0, 3],
  [4, 7],
  [8, 11],
  [12, 15],
  [16, 17],
  [18, 21],
  [22, 23],
  [24, 27],
  [28, 31],
  [32, 35],
] as const;

const tabColumns = tabData.map((strings, idx) => {
  const beamGroup = beamGroups.find(
    ([start, end]) => idx >= start && idx <= end,
  );

  return (
    <TabColumn
      key={idx}
      left={`${idx * TAB_COLUMN_WIDTH}em`}
      strings={strings}
      beamCount={idx === 16 || idx === 17 || idx === 22 || idx === 23 ? 1 : 2}
      startsBeam={idx === beamGroup?.[0]}
      endsBeam={idx === beamGroup?.[1]}
      startsMeasure={idx === 16 || idx === 28}
    />
  );
});

function TablatureTrack({
  layout = "desktop",
}: {
  layout?: "desktop" | "mobile";
}) {
  return (
    <div className="baseVertFlex relative min-h-0 w-full flex-1 select-none">
      <div className="w-full overflow-hidden">
        <div
          className={`baseFlex relative w-full overflow-hidden ${layout === "mobile" ? "h-[15.9375em]" : "h-[315px]"}`}
        >
          <div className="relative flex size-full overflow-hidden [--playhead-position:50%]">
            {/* Complementary clips keep colors aligned with the playhead at every width. */}
            {([false, true] as const).map((isHighlighted) => (
              <div
                key={String(isHighlighted)}
                className={`absolute inset-0 ${isHighlighted ? "text-primary" : "text-foreground"}`}
                style={{
                  clipPath: isHighlighted
                    ? "inset(0 calc(100% - var(--playhead-position)) 0 0)"
                    : "inset(0 0 0 var(--playhead-position))",
                }}
              >
                <div
                  className="relative flex h-full items-center"
                  style={{ width: `${tabData.length * TAB_COLUMN_WIDTH}em` }}
                >
                  {tabColumns}
                </div>
              </div>
            ))}
            <div
              className="absolute top-1/2 z-10 h-[7.75em] w-[0.125em] -translate-x-1/2 -translate-y-1/2 bg-primary"
              style={{ left: "var(--playhead-position)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// A scaled 800 × 400 landscape viewport, independent of the page's orientation.
function MobileTablatureScreenshot() {
  return (
    <div
      className="heroScreenshotStage heroScreenshotMobile w-full min-w-0 max-w-[800px] lg:hidden"
      aria-hidden="true"
    >
      <div className="heroScreenshotTilt">
        <div className="heroScreenshotApp baseVertFlex playbackModalGradient pointer-events-none relative aspect-[2/1] w-full select-none !justify-between gap-0 overflow-hidden p-0 text-[2cqw] leading-[1.5]">
          <div className="baseFlex w-full !justify-between px-[1em] pt-[0.5em]">
            <div className="baseFlex !justify-start gap-[1em]">
              <span className="whitespace-nowrap text-[1.25em] font-bold">
                Let Her Go
              </span>
              <div className="h-[1.25em] w-[0.0625em] bg-foreground/50"></div>
              <div className="baseFlex gap-[0.25em] whitespace-nowrap">
                <QuarterNote className="h-[0.625em] w-[0.625em]" />
                70 BPM
              </div>
            </div>
            <X className="size-[1.25em] opacity-70" />
          </div>

          <TablatureTrack layout="mobile" />

          <div className="baseVertFlex w-full gap-[0.5em] pb-[0.5em]">
            {/* Landscape playback controls stay together on one row. */}
            <div className="baseFlex w-full gap-[1em] px-[1em]">
              <div className="baseFlex size-[2em] shrink-0">
                <PlayIcon style={{ width: "0.75em", height: "0.75em" }} />
              </div>
              <div className="baseFlex gap-[0.25em]">1x</div>
              <span>0:23</span>
              <div className="relative h-[0.5em] min-w-0 flex-1 rounded-full bg-[hsl(var(--gray)/0.5)]">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: HERO_PLAYBACK_PROGRESS_PERCENT }}
                />
                <div
                  className="absolute top-1/2 size-[1.125em] -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/50 bg-primary"
                  style={{ left: HERO_PLAYBACK_PROGRESS_PERCENT }}
                />
              </div>
              <span>4:12</span>
              <div className="baseFlex size-[2em] shrink-0 rounded-sm border">
                <CgArrowsShrinkH className="size-[1.5em]" />
              </div>
            </div>

            {/* Match the app's compact landscape metadata and settings row. */}
            <div className="baseFlex w-full !justify-between gap-[1em] px-[1em]">
              <div className="baseFlex gap-[1em]">
                <div className="baseVertFlex !items-start">
                  <span className="text-[0.875em] font-medium">Tuning</span>
                  <span>Standard</span>
                </div>
                <div className="baseVertFlex !items-start">
                  <span className="text-[0.875em] font-medium">Capo</span>
                  <span>None</span>
                </div>
                <div className="baseFlex h-[2.75em] gap-[0.5em] rounded-sm border px-[1em] text-[0.875em] font-medium">
                  <TuningFork className="size-[1.125em]" />
                  Tuner
                </div>
              </div>
              <div className="baseFlex gap-[1em]">
                <div className="baseFlex gap-[0.5em] text-[0.875em]">
                  <span className="font-medium">Section</span>
                  <div className="baseFlex h-[2.75em] gap-[0.5em] rounded-sm border px-[0.75em]">
                    <span className="whitespace-nowrap">Full tab</span>
                    <ChevronDown className="size-[1.125em] opacity-50" />
                  </div>
                </div>
                <div className="baseFlex size-[2.25em] rounded-sm border">
                  <IoMdSettings className="size-[1.25em]" />
                </div>
                <div className="baseFlex size-[2.25em] rounded-sm border">
                  <FaListUl className="size-[1em]" />
                </div>
                <div className="baseFlex size-[2.25em] rounded-sm border">
                  <FaBook className="size-[1em]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TablatureScreenshot() {
  return (
    <div
      className="heroScreenshotStage hidden w-full min-w-0 lg:block lg:flex-1"
      aria-hidden="true"
    >
      <div className="heroScreenshotTilt">
        <div className="heroScreenshotApp baseVertFlex playbackModalGradient pointer-events-none relative h-[460px] w-full select-none !justify-between gap-0 overflow-hidden p-0 md:h-[560px] lg:h-[650px]">
          {/* Top Header Section */}
          <div className="baseFlex mt-4 w-full !items-end !justify-between gap-2 px-4">
            <div className="baseFlex w-full !items-end !justify-start gap-2">
              <div className="baseVertFlex w-full !items-start gap-2">
                <div className="baseFlex !justify-start gap-4">
                  <div className="baseFlex w-full !justify-start">
                    <div className="size-full max-w-[80vw] tablet:max-w-[600px]">
                      <div style={{ padding: 0 }}>
                        <span className="whitespace-nowrap text-xl font-bold tablet:text-2xl">
                          Let Her Go
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
                          70 BPM
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
          <TablatureTrack />

          <div className="baseVertFlex w-full lg:gap-2">
            {/* Desktop (non-landscape) PlaybackAudioControls */}
            <div className="baseVertFlex w-full max-w-[85vw] gap-2 sm:max-w-[677px]">
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
                      style={{ transform: `scaleX(${HERO_PLAYBACK_PROGRESS})` }}
                      className="absolute left-0 top-0 z-10 h-full w-full origin-left rounded-[4px] bg-primary"
                    ></div>
                  </div>
                  <div
                    style={{
                      left: HERO_PLAYBACK_PROGRESS_PERCENT,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                    className="absolute !z-20 size-[18px] rounded-full border border-foreground/50 bg-primary"
                  ></div>
                </div>
              </div>

              <div className="baseFlex w-full !justify-between">
                <div className="baseFlex w-9 !justify-start self-start">
                  0:23
                </div>

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

                <div className="baseFlex w-9 !justify-end self-start">4:12</div>
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
                    <div className="border-input flex h-10 w-[200px] items-center justify-between gap-2 rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm">
                      Acoustic guitar - Steel
                      <ChevronDown className="size-4 shrink-0 opacity-50" />
                    </div>
                  </div>

                  <div className="baseVertFlex !items-start gap-2">
                    <div className="text-sm font-medium leading-none">
                      Speed
                    </div>
                    <div className="border-input flex h-10 w-[85px] items-center justify-between gap-2 rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm">
                      1x
                      <ChevronDown className="size-4 shrink-0 opacity-50" />
                    </div>
                  </div>

                  <div className="baseVertFlex !items-start gap-2">
                    <div className="text-sm font-medium leading-none">
                      Loop delay
                    </div>
                    <div className="border-input flex h-10 w-20 items-center justify-between gap-2 rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm">
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
                    <PiMetronome className="size-5" />
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
