import Link from "next/link";
import { GiMusicalScore } from "react-icons/gi";
import { HiOutlineLightBulb } from "react-icons/hi";
import { BsBarChartLine } from "react-icons/bs";
import HeaderLogo from "~/components/Header/HeaderLogo";
import {
  DifficultyBars,
  GenreBadge,
  SITE_STATS,
  TabStaff,
  VariationFrame,
} from "~/components/HomepageVariations/shared";

const FEATURES = [
  { icon: GiMusicalScore, title: "Compose", desc: "An advanced editor built for strumming patterns and fast keyboard navigation." },
  { icon: HiOutlineLightBulb, title: "Find inspiration", desc: "A growing library of tabs and a weekly featured artist section." },
  { icon: BsBarChartLine, title: "Practice", desc: "Play along at any speed, on any instrument, section by section." },
];

function EditorialSplit() {
  return (
    <VariationFrame id={1} title="Editorial Split">
      <div className="baseVertFlex z-10 w-full px-4 py-14 md:py-20">
        <section className="grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          {/* Left: statement */}
          <div className="baseVertFlex !items-start gap-6">
            <span className="baseFlex gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-xs font-medium text-foreground/75">
              <span className="size-1.5 rounded-full bg-audio" />
              The guitar tab studio
            </span>

            <div className="baseVertFlex !items-start gap-3">
              <div className="baseFlex gap-3">
                <HeaderLogo width={230} height={40} />
              </div>
              <h1 className="text-balance text-4xl font-bold leading-[1.1] md:text-6xl">
                Create and share your riffs{" "}
                <span className="italic text-primary underline decoration-primary/40 underline-offset-4">
                  exactly
                </span>{" "}
                how you want them to sound.
              </h1>
            </div>

            <p className="max-w-md text-pretty text-lg text-foreground/70">
              Autostrum gives you a precise editor and realistic generated audio,
              so your tabs sound the way you hear them in your head.
            </p>

            <div className="baseFlex flex-wrap !justify-start gap-3">
              <Link
                href="/create"
                className="baseFlex gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-primaryButton transition-transform hover:scale-[1.02]"
              >
                Start composing
              </Link>
              <Link
                href="/explore"
                className="baseFlex gap-2 rounded-lg border bg-secondary/50 px-6 py-3 font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                Explore tabs
              </Link>
            </div>

            <div className="mt-2 grid w-full max-w-md grid-cols-2 gap-x-6 gap-y-4 border-t pt-6 sm:grid-cols-4">
              {SITE_STATS.map((stat) => (
                <div key={stat.label} className="baseVertFlex !items-start gap-0.5">
                  <span className="text-xl font-bold text-foreground">{stat.value}</span>
                  <span className="text-xs text-foreground/60">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: oversized tab viewer */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/10 blur-2xl"
            />
            <div className="baseVertFlex w-full overflow-hidden rounded-2xl border bg-background shadow-xl">
              <div className="baseFlex w-full !justify-between border-b bg-secondary/40 px-4 py-3">
                <div className="baseVertFlex !items-start">
                  <span className="text-sm font-semibold">Everlong</span>
                  <span className="text-xs text-foreground/60">Foo Fighters</span>
                </div>
                <div className="baseFlex gap-3">
                  <span className="rounded-md border bg-background px-2 py-1 text-xs text-foreground/70">
                    150 BPM
                  </span>
                  <div className="baseFlex gap-1.5">
                    <span className="text-xs text-foreground/60">Difficulty</span>
                    <DifficultyBars level={4} />
                  </div>
                </div>
              </div>

              <div className="baseVertFlex w-full gap-4 p-4">
                <div className="baseFlex w-full !justify-start">
                  <span className="rounded-md border bg-secondary/60 px-2 py-0.5 text-xs font-medium">
                    Intro / Verse
                  </span>
                </div>
                <TabStaff seed={7} measures={5} showLabels height={130} className="w-full" />
                <TabStaff seed={19} measures={5} showLabels height={130} className="w-full" />

                <div className="baseFlex w-full !justify-between pt-1">
                  <GenreBadge name="Rock" />
                  <button
                    type="button"
                    className="baseFlex gap-2 rounded-full bg-audio px-5 py-2 font-semibold text-audio-foreground shadow-md"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    Practice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature strip */}
        <section className="mt-16 grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="baseVertFlex !items-start gap-3 rounded-xl border bg-secondary/30 p-6"
            >
              <div className="baseFlex rounded-lg border bg-secondary-active/50 p-2.5">
                <feature.icon className="size-6" />
              </div>
              <p className="text-lg font-bold">{feature.title}</p>
              <p className="text-sm text-foreground/70">{feature.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </VariationFrame>
  );
}

export default EditorialSplit;
