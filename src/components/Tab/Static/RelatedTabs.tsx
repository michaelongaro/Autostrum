import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import GridTabCard from "~/components/Search/GridTabCard";
import { Button } from "~/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "~/components/ui/carousel";
import { Separator } from "~/components/ui/separator";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";
import {
  relatedTabSectionHeading,
  type RelatedTabCandidate,
  type RelatedTabSection,
  type RelatedTabSectionKind,
} from "~/utils/relatedTabs";

interface RelatedArtist {
  id: number;
  name: string;
}

interface RelatedTabsProps {
  sections: RelatedTabSection<RelatedTabCandidate>[];
  artist: RelatedArtist | null;
}

function artistTabsHref(artist: RelatedArtist) {
  return `/artist/${encodeURIComponent(artist.name)}/${artist.id}/filters`;
}

function browseAllTabsSection(
  sections: RelatedTabSection<RelatedTabCandidate>[],
): RelatedTabSectionKind | null {
  return (
    sections.find(
      (section) => section.kind === "similar" || section.kind === "explore",
    )?.kind ??
    sections[0]?.kind ??
    null
  );
}

function sectionHasMoreArtistTabs(
  section: RelatedTabSection<RelatedTabCandidate>,
) {
  return (
    section.kind === "artist" && (section.totalCount ?? 0) > section.tabs.length
  );
}

function RelatedTabs({ sections, artist }: RelatedTabsProps) {
  const { userId } = useAuth();
  const { color, theme } = useTabStore((state) => ({
    color: state.color,
    theme: state.theme,
  }));
  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  if (sections.length === 0) return null;

  const artistName = artist?.name.trim() ? artist.name.trim() : null;
  const browseAllKind = browseAllTabsSection(sections);

  return (
    <nav
      id="related-tabs"
      aria-label="Related tabs"
      className="baseVertFlex mt-12 w-full !items-start gap-8 border-y bg-background py-8 shadow-lg md:rounded-xl md:border-x md:p-8"
    >
      {sections.map((section) => {
        const heading = relatedTabSectionHeading(section.kind, artistName);
        const showMoreArtistTabs =
          sectionHasMoreArtistTabs(section) && Boolean(artist && artistName);
        const showBrowseAllTabs = section.kind === browseAllKind;

        return (
          <section
            key={section.kind}
            data-related-section={section.kind}
            className="baseVertFlex w-full !items-start gap-4"
          >
            <div className="baseFlex w-full !items-baseline !justify-between gap-3 px-4 md:px-0">
              <div className="baseVertFlex min-w-0 !items-start sm:gap-1">
                <h2 className="m-0 text-lg font-bold tracking-tight text-foreground md:text-[1.35rem]">
                  {section.kind === "artist" && artist && artistName ? (
                    <>Other tabs by {artistName}</>
                  ) : (
                    heading
                  )}
                </h2>
                <Separator className="w-full bg-primary" />
              </div>

              {(showMoreArtistTabs || showBrowseAllTabs) && (
                <div className="baseFlex shrink-0 gap-4">
                  {showMoreArtistTabs && artist && artistName && (
                    <Button variant="link" asChild>
                      <Link
                        prefetch={false}
                        href={artistTabsHref(artist)}
                        className="hidden !h-6 !px-0 !py-0 text-foreground sm:block"
                      >
                        All tabs by {artistName}
                      </Link>
                    </Button>
                  )}

                  {showBrowseAllTabs && (
                    <Button variant="link" asChild>
                      <Link
                        prefetch={false}
                        href="/search/filters"
                        className="!h-6 !px-0 !py-0 text-foreground"
                      >
                        Browse all tabs
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Carousel
              opts={{
                dragFree: true,
                align: "start",
              }}
              className="w-full"
            >
              <CarouselContent className="mr-4 items-start justify-start pb-1 md:mr-0">
                {section.tabs.map((tab) => (
                  <CarouselItem
                    key={tab.id}
                    className="basis-auto first:ml-4 md:first:ml-0"
                  >
                    <GridTabCard
                      minimalTab={tab}
                      currentUser={currentUser}
                      color={color}
                      theme={theme}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </section>
        );
      })}
    </nav>
  );
}

export default RelatedTabs;
