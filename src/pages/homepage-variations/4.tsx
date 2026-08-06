import Link from "next/link";
import {
  DifficultyBars,
  FEATURED_USERS,
  GenreBadge,
  MiniTabCard,
  SAMPLE_TABS,
  SectionHeading,
  SITE_STATS,
  StarRating,
  TabStaff,
  VariationFrame,
} from "~/components/HomepageVariations/shared";
import { BsBarChartLine } from "react-icons/bs";
import { FaRegStar } from "react-icons/fa";

function StatsAndProof() {
  const trending = SAMPLE_TABS.slice(0, 5);

  return (
    <VariationFrame id={4} title="Stats & Proof">
      <div className="baseVertFlex z-10 w-full gap-16 px-4 py-14 md:py-20">
        {/* Hero with counters */}
        <section className="baseVertFlex w-full max-w-4xl gap-8 text-center">
          <h1 className="text-balance text-4xl font-bold leading-[1.1] md:text-6xl">
            The tab library that keeps{" "}
            <span className="text-primary">growing every week.</span>
          </h1>
          <p className="max-w-xl text-pretty text-lg text-foreground/70">
            Thousands of guitarists compose, share, and practice on Autostrum.
            Join a community that hears every note the way you do.
          </p>

          <div className="baseFlex flex-wrap gap-3">
            <Link
              href="/create"
              className="baseFlex rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-primaryButton transition-transform hover:scale-[1.02]"
            >
              Start composing
            </Link>
            <Link
              href="/explore"
              className="baseFlex rounded-lg border bg-secondary/50 px-6 py-3 font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Browse the library
            </Link>
          </div>

          <div className="mt-4 grid w-full grid-cols-2 gap-4 md:grid-cols-4">
            {SITE_STATS.map((stat) => (
              <div
                key={stat.label}
                className="baseVertFlex gap-1 rounded-2xl border bg-secondary/30 p-6"
              >
                <span className="text-3xl font-bold text-primary md:text-4xl">
                  {stat.value}
                </span>
                <span className="text-sm text-foreground/60">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Trending strip */}
        <section className="baseVertFlex w-full max-w-6xl gap-6">
          <SectionHeading
            icon={<BsBarChartLine className="text-primary" />}
            action={
              <Link
                href="/explore"
                className="text-sm font-medium text-primary hover:underline"
              >
                View more
              </Link>
            }
          >
            Trending this week
          </SectionHeading>

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trending.slice(0, 3).map((tab, i) => (
              <MiniTabCard
                key={tab.id}
                tab={tab}
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        </section>

        {/* Leaderboard / social proof */}
        <section className="grid w-full max-w-6xl grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="baseVertFlex !items-stretch gap-4 rounded-2xl border bg-secondary/30 p-6">
            <SectionHeading icon={<FaRegStar className="text-primary" />}>
              Top creators
            </SectionHeading>
            <div className="baseVertFlex !items-stretch divide-y">
              {FEATURED_USERS.map((user, i) => (
                <div
                  key={user.username}
                  className="baseFlex !justify-between gap-4 py-3"
                >
                  <div className="baseFlex gap-3">
                    <span className="baseFlex size-8 rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-foreground">
                      {user.username}
                    </span>
                  </div>
                  <div className="baseFlex gap-6 text-sm text-foreground/70">
                    <span className="hidden sm:inline">{user.totalTabs} tabs</span>
                    <span className="hidden sm:inline">{user.totalViews} views</span>
                    <StarRating rating={user.averageRating} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial-ish featured tab */}
          <div className="baseVertFlex !items-stretch gap-4 rounded-2xl border bg-background p-6 shadow-lg">
            <span className="text-sm font-medium text-foreground/60">
              Featured tab of the week
            </span>
            <TabStaff seed={41} measures={4} showLabels height={120} className="w-full" />
            <div className="baseFlex !justify-between">
              <div className="baseVertFlex !items-start">
                <span className="text-lg font-bold">Wake Me Up...</span>
                <span className="text-sm text-foreground/60">Green Day</span>
              </div>
              <DifficultyBars level={3} />
            </div>
            <div className="baseFlex !justify-between">
              <GenreBadge name="Rock" />
              <StarRating rating={4.7} count={19} />
            </div>
          </div>
        </section>
      </div>
    </VariationFrame>
  );
}

export default StatsAndProof;
