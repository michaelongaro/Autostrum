import Link from "next/link";
import { useState } from "react";
import {
  DifficultyBars,
  GenreBadge,
  PickLogo,
  SAMPLE_TABS,
  TabStaff,
  VariationFrame,
} from "~/components/HomepageVariations/shared";
import { FiSearch } from "react-icons/fi";

const QUICK_SEARCHES = ["Foo Fighters", "Fingerstyle", "Drop D", "Beginner", "Indie"];

function MinimalSpotlight() {
  const [query, setQuery] = useState("");
  const tab = SAMPLE_TABS[0]!;

  return (
    <VariationFrame id={5} title="Minimal Spotlight">
      <div className="baseVertFlex z-10 min-h-[80vh] w-full gap-12 px-4 py-20">
        <section className="baseVertFlex w-full max-w-2xl gap-8 text-center">
          <PickLogo size={64} />

          <h1 className="text-balance text-4xl font-bold leading-[1.1] md:text-6xl">
            Find your next riff.
          </h1>
          <p className="max-w-md text-pretty text-lg text-foreground/65">
            Search thousands of community tabs, or start a blank canvas of your own.
          </p>

          {/* Search */}
          <form
            className="baseFlex w-full max-w-xl overflow-hidden rounded-full border bg-secondary/40 shadow-sm focus-within:ring-2 focus-within:ring-primary/40"
            onSubmit={(e) => e.preventDefault()}
          >
            <span className="pl-5 text-foreground/50">
              <FiSearch className="size-5" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for your favorite songs..."
              className="w-full bg-transparent px-4 py-4 text-foreground outline-none placeholder:text-foreground/45"
              aria-label="Search tabs"
            />
            <button
              type="submit"
              className="m-1.5 shrink-0 rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground"
            >
              Search
            </button>
          </form>

          <div className="baseFlex flex-wrap gap-2">
            {QUICK_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="rounded-full border bg-background px-3 py-1 text-sm text-foreground/70 transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {term}
              </button>
            ))}
          </div>
        </section>

        {/* Single spotlight tab */}
        <section className="baseVertFlex w-full max-w-3xl gap-3">
          <span className="text-sm font-medium text-foreground/55">
            Editor&apos;s pick
          </span>
          <div className="baseVertFlex w-full overflow-hidden rounded-2xl border bg-background shadow-xl">
            <div className="baseFlex w-full !justify-between border-b bg-secondary/40 px-5 py-3">
              <div className="baseVertFlex !items-start">
                <span className="font-semibold">{tab.title}</span>
                <span className="text-xs text-foreground/60">{tab.artist}</span>
              </div>
              <div className="baseFlex gap-3">
                <GenreBadge name={tab.genre} />
                <DifficultyBars level={tab.difficulty} />
              </div>
            </div>
            <div className="w-full p-5">
              <TabStaff seed={tab.seed} measures={6} showLabels height={130} className="w-full" />
            </div>
          </div>
          <Link
            href="/explore"
            className="text-sm font-medium text-primary hover:underline"
          >
            Or browse the full library
          </Link>
        </section>
      </div>
    </VariationFrame>
  );
}

export default MinimalSpotlight;
