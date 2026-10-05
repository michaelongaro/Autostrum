import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import GridTabCard from "~/components/Search/GridTabCard";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";
import {
  relatedTabSectionHeading,
  type RelatedTabCandidate,
  type RelatedTabSection,
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
  const hasArtistSection = sections.some((section) => section.kind === "artist");

  return (
    <nav
      id="related-tabs"
      aria-label="Related tabs"
      className="baseVertFlex mt-12 w-full !items-start gap-8 border-y bg-background px-4 py-6 shadow-lg md:rounded-xl md:border md:px-6"
    >
      {sections.map((section) => {
        const heading = relatedTabSectionHeading(section.kind, artistName);

        return (
          <section
            key={section.kind}
            data-related-section={section.kind}
            className="baseVertFlex w-full !items-start gap-4"
          >
            <div className="baseFlex w-full !items-end !justify-between gap-3">
              <div className="baseVertFlex min-w-0 !items-start gap-1">
                <h2 className="m-0 text-lg font-bold tracking-tight text-foreground md:text-[1.35rem]">
                  {section.kind === "artist" && artist && artistName ? (
                    <>
                      Other tabs by{" "}
                      <Link
                        prefetch={false}
                        href={artistTabsHref(artist)}
                        className="underline-offset-4 hover:underline"
                      >
                        {artistName}
                      </Link>
                    </>
                  ) : (
                    heading
                  )}
                </h2>
                <Separator className="w-full bg-primary" />
              </div>

              {section.kind === "artist" && artist && artistName && (
                <Button variant="link" asChild>
                  <Link
                    prefetch={false}
                    href={artistTabsHref(artist)}
                    className="!h-6 shrink-0 !px-0 !py-0 text-foreground"
                  >
                    View all
                  </Link>
                </Button>
              )}
            </div>

            <div className="flex w-full flex-wrap justify-center gap-4 md:justify-start">
              {section.tabs.map((tab) => (
                <GridTabCard
                  key={tab.id}
                  minimalTab={tab}
                  currentUser={currentUser}
                  color={color}
                  theme={theme}
                />
              ))}
            </div>
          </section>
        );
      })}

      <div className="baseFlex w-full flex-wrap !justify-start gap-x-4 gap-y-1">
        {artist && artistName && !hasArtistSection && (
          <Button variant="link" asChild>
            <Link
              prefetch={false}
              href={artistTabsHref(artist)}
              className="!h-auto !px-0 text-foreground"
            >
              All tabs by {artistName}
            </Link>
          </Button>
        )}

        <Button variant="link" asChild>
          <Link
            prefetch={false}
            href="/search/filters"
            className="!h-auto !px-0 text-foreground"
          >
            Browse all tabs
          </Link>
        </Button>
      </div>
    </nav>
  );
}

export default RelatedTabs;
