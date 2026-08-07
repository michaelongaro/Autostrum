import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import GridTabCard from "~/components/Search/GridTabCard";
import TabCardSkeleton from "~/components/Search/TabCardSkeleton";
import { Button } from "~/components/ui/button";
import type { MinimalTabRepresentation } from "~/server/api/routers/search";
import type { UserMetadata } from "~/server/api/routers/user";
import { useTabStore, type COLORS, type THEME } from "~/stores/TabStore";
import { api } from "~/utils/api";

function splitIntoRows(tabs: MinimalTabRepresentation[]) {
  const rows: MinimalTabRepresentation[][] = [[], [], []];

  tabs.forEach((tab, index) => {
    rows[index % 3]!.push(tab);
  });

  return rows.map((row) => {
    if (row.length === 0) return row;
    let denseRow = row;
    // Keep rows dense enough for a seamless loop on wide screens.
    while (denseRow.length < 6) {
      denseRow = [...denseRow, ...row];
    }
    return denseRow;
  });
}

function MarqueeRow({
  tabs,
  direction,
  duration,
  color,
  theme,
  currentUser,
  rowIndex,
}: {
  tabs: MinimalTabRepresentation[];
  direction: "left" | "right";
  duration: string;
  color: COLORS;
  theme: THEME;
  currentUser: UserMetadata | null | undefined;
  rowIndex: number;
}) {
  const loopTabs = [...tabs, ...tabs];

  return (
    <div className="homepageMarqueeRow relative w-full overflow-hidden py-1">
      <div
        className="homepageMarqueeTrack baseFlex !justify-start gap-4"
        data-direction={direction}
        style={{ ["--marquee-duration" as string]: duration }}
      >
        {loopTabs.map((tab, index) => (
          <div key={`${rowIndex}-${tab.id}-${index}`} className="shrink-0">
            <GridTabCard
              minimalTab={tab}
              currentUser={currentUser}
              color={color}
              theme={theme}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="baseVertFlex w-full gap-3 py-2">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="baseFlex w-full !justify-start gap-4 overflow-hidden px-4"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <TabCardSkeleton
              key={`marquee-skeleton-${row}-${index}`}
              uniqueKey={`marquee-skeleton-${row}-${index}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function TabMarquee() {
  const { userId } = useAuth();

  const { color, theme } = useTabStore((state) => ({
    color: state.color,
    theme: state.theme,
  }));

  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  const { data: tabBundles, isLoading } =
    api.search.getMostRecentAndPopularTabs.useQuery();

  const rows = useMemo(() => {
    const combined = [
      ...(tabBundles?.mostPopularTabs ?? []),
      ...(tabBundles?.mostRecentTabs ?? []),
    ];

    const seen = new Set<number>();
    const unique = combined.filter((tab) => {
      if (seen.has(tab.id)) return false;
      seen.add(tab.id);
      return true;
    });

    return splitIntoRows(unique);
  }, [tabBundles]);

  const hasTabs = rows.some((row) => row.length > 0);

  return (
    <section className="baseVertFlex relative w-full max-w-[1400px] gap-0 overflow-hidden px-0 md:px-4 lg:px-6">
      <div className="relative w-full overflow-hidden rounded-none border-y bg-background py-4 shadow-md md:rounded-xl md:border">
        {isLoading || !hasTabs ? (
          <SkeletonRows />
        ) : (
          <div className="baseVertFlex w-full gap-2">
            <MarqueeRow
              tabs={rows[0]!}
              direction="left"
              duration="60s"
              color={color}
              theme={theme}
              currentUser={currentUser}
              rowIndex={0}
            />
            <MarqueeRow
              tabs={rows[1]!}
              direction="right"
              duration="70s"
              color={color}
              theme={theme}
              currentUser={currentUser}
              rowIndex={1}
            />
            <MarqueeRow
              tabs={rows[2]!}
              direction="left"
              duration="65s"
              color={color}
              theme={theme}
              currentUser={currentUser}
              rowIndex={2}
            />
          </div>
        )}

        {/* Edge fades so cards softly exit */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent md:w-16" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent md:w-16" />

        {/* Center overlay CTA */}
        <div className="pointer-events-none absolute inset-0 z-20 baseFlex px-4">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/10 via-background/55 to-background/10" />
          <div className="pointer-events-auto relative baseVertFlex max-w-md gap-4 rounded-xl border bg-background/95 px-6 py-7 text-center shadow-lg backdrop-blur-sm md:px-10 md:py-9">
            <div className="baseVertFlex gap-2">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Explore thousands of tabs
              </h2>
              <p className="text-sm text-foreground/80 md:text-base">
                Filter by genre and difficulty, discover weekly featured
                players, and jump into anything that catches your ear.
              </p>
            </div>
            <Button asChild size="lg" className="px-8">
              <Link prefetch={false} href="/explore">
                Browse the library
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TabMarquee;
