import Link from "next/link";
import { GiMusicalScore } from "react-icons/gi";
import { BsBarChartLine } from "react-icons/bs";
import HeaderLogo from "~/components/Header/HeaderLogo";
import {
  DifficultyBars,
  GENRES,
  GenreBadge,
  SITE_STATS,
  TabStaff,
  VariationFrame,
} from "~/components/HomepageVariations/shared";

function BentoGrid() {
  return (
    <VariationFrame id={2} title="Bento Grid">
      <div className="baseVertFlex z-10 w-full px-4 py-14 md:py-20">
        <div className="grid w-full max-w-5xl auto-rows-[minmax(0,auto)] grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Hero tile */}
          <div className="baseVertFlex !items-start justify-between gap-6 rounded-2xl border bg-secondary/40 p-6 md:p-8 col-span-2 row-span-2">
            <HeaderLogo width={220} height={38} />
            <div className="baseVertFlex !items-start gap-3">
              <h1 className="text-balance text-3xl font-bold leading-tight md:text-4xl">
                Create and share your riffs{" "}
                <span className="italic text-primary underline decoration-primary/40 underline-offset-4">
                  exactly
                </span>{" "}
                how you want.
              </h1>
              <p className="text-pretty text-foreground/70">
                A precise editor, realistic audio, and a community of guitarists —
                all in one place.
              </p>
            </div>
            <div className="baseFlex flex-wrap !justify-start gap-3">
              <Link href="/create" className="baseFlex rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-primaryButton transition-transform hover:scale-[1.02]">
                Start composing
              </Link>
              <Link href="/explore" className="baseFlex rounded-lg border bg-background px-5 py-2.5 font-semibold transition-colors hover:bg-secondary">
                Explore tabs
              </Link>
            </div>
          </div>

          {/* Featured tab tile */}
          <div className="baseVertFlex !items-stretch gap-3 rounded-2xl border bg-background p-4 col-span-2 row-span-2">
            <div className="baseFlex !justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
                Featured tab
              </span>
              <span className="rounded-md border bg-secondary/60 px-2 py-0.5 text-xs">135 BPM</span>
            </div>
            <div className="rounded-lg border bg-secondary/20 p-3">
              <TabStaff seed={12} measures={4} showLabels height={110} />
            </div>
            <div className="baseFlex !justify-between">
              <div className="baseVertFlex !items-start">
                <span className="font-semibold">The Avatar&apos;s Love</span>
                <span className="text-sm text-foreground/60">Avatar the Last Airbender</span>
              </div>
              <DifficultyBars level={2} />
            </div>
            <div className="baseFlex !justify-between">
              <GenreBadge name="Misc." />
              <button type="button" className="baseFlex gap-1.5 rounded-full bg-audio px-4 py-1.5 text-sm font-semibold text-audio-foreground">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                Practice
              </button>
            </div>
          </div>

          {/* Compose tile */}
          <div className="baseVertFlex !items-start gap-2 rounded-2xl border bg-secondary/30 p-5">
            <div className="baseFlex rounded-lg border bg-secondary-active/50 p-2">
              <GiMusicalScore className="size-5" />
            </div>
            <p className="font-bold">Compose</p>
            <p className="text-sm text-foreground/65">Strumming patterns, keyboard nav, and more.</p>
          </div>

          {/* Practice tile */}
          <div className="baseVertFlex !items-start gap-2 rounded-2xl border bg-secondary/30 p-5">
            <div className="baseFlex rounded-lg border bg-secondary-active/50 p-2">
              <BsBarChartLine className="size-5" />
            </div>
            <p className="font-bold">Practice</p>
            <p className="text-sm text-foreground/65">Play along at any speed, section by section.</p>
          </div>

          {/* Stats tile */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-secondary/40 p-5 col-span-2">
            {SITE_STATS.map((stat) => (
              <div key={stat.label} className="baseVertFlex !items-start gap-0.5">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-xs text-foreground/60">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Genre tile */}
          <div className="baseVertFlex !items-start gap-3 rounded-2xl border bg-secondary/30 p-5 col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
              Browse by genre
            </span>
            <div className="baseFlex flex-wrap !justify-start gap-2">
              {GENRES.slice(0, 8).map((genre) => (
                <span
                  key={genre.name}
                  className="baseFlex gap-1.5 rounded-full border bg-background px-3 py-1 text-sm"
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: `hsl(${genre.color})` }} />
                  {genre.name}
                  <span className="text-foreground/45">{genre.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </VariationFrame>
  );
}

export default BentoGrid;
