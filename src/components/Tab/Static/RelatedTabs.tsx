import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GridTabCardContent } from "~/components/Search/GridTabCard";
import { Button } from "~/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "~/components/ui/carousel";
import type { MinimalTabRepresentation } from "~/server/api/routers/search";
import { useAppPreferencesStore } from "~/stores/AppPreferencesStore";

import { api } from "~/utils/api";
import {
  relatedTabSectionHeading,
  type RelatedTabCandidate,
  type RelatedTabSection,
  type RelatedTabSectionKind,
} from "~/utils/relatedTabs";
import type { TabScreenshotRenderer } from "~/utils/tabScreenshotMasks";

interface RelatedArtist {
  id: number;
  name: string;
}

interface RelatedTabsProps {
  sections: RelatedTabSection<RelatedTabCandidate & MinimalTabRepresentation>[];
  artist: RelatedArtist | null;
}

function artistTabsHref(artist: RelatedArtist) {
  return `/artist/${encodeURIComponent(artist.name)}/${artist.id}/filters`;
}

function browseAllTabsSection(
  sections: RelatedTabSection<RelatedTabCandidate>[],
): RelatedTabSectionKind | null {
  return (
    sections.find((section) => section.kind === "similar")?.kind ??
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

function RelatedTabsScreenshotRenderer({
  onChange,
}: {
  onChange: (renderer: TabScreenshotRenderer | undefined) => void;
}) {
  const params = useSearchParams();
  const renderers = params.getAll("screenshotRenderer");
  const renderer = renderers.length === 1 ? renderers[0] : undefined;

  useEffect(() => {
    onChange(
      renderer === "gradient-map" || renderer === "masks"
        ? renderer
        : undefined,
    );
  }, [onChange, renderer]);

  return null;
}

function RelatedTabs({ sections, artist }: RelatedTabsProps) {
  const { userId } = useAuth();
  const pathname = usePathname();
  const [screenshotRenderer, setScreenshotRenderer] =
    useState<TabScreenshotRenderer>();
  const { color, theme } = useAppPreferencesStore((state) => ({
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
      className="baseVertFlex mt-12 w-full !items-start gap-8 border-y bg-background py-8 shadow-lg md:rounded-xl md:border-x"
    >
      {/* Keep the URL-driven screenshot override outside the card render path. */}
      <Suspense fallback={null}>
        <RelatedTabsScreenshotRenderer onChange={setScreenshotRenderer} />
      </Suspense>
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
            <div className="baseFlex w-full !items-baseline !justify-between gap-3 px-4 md:px-8">
              <div className="baseVertFlex min-w-0 !items-start sm:gap-1">
                <h2 className="m-0 text-lg font-bold tracking-tight text-foreground md:text-[1.35rem]">
                  {section.kind === "artist" && artist && artistName ? (
                    <>Other tabs by {artistName}</>
                  ) : (
                    heading
                  )}
                </h2>
              </div>

              {(showMoreArtistTabs || showBrowseAllTabs) && (
                <div className="baseFlex shrink-0 gap-4">
                  {showMoreArtistTabs && artist && artistName && (
                    <Button
                      role="link"
                      variant="link"
                      nativeButton={false}
                      render={
                        <Link
                          prefetch={false}
                          href={artistTabsHref(artist)}
                          className="hidden !h-6 !px-0 !py-0 text-foreground sm:block"
                        >
                          All tabs by {artistName}
                        </Link>
                      }
                    />
                  )}

                  {showBrowseAllTabs && (
                    <Button
                      role="link"
                      variant="link"
                      nativeButton={false}
                      render={
                        <Link
                          prefetch={false}
                          href="/search/filters"
                          className="!h-6 !px-0 !py-0 text-foreground"
                        >
                          Browse all tabs
                        </Link>
                      }
                    />
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
              <CarouselContent className="mr-4 items-start justify-start pb-1 md:mr-8">
                {section.tabs.map((tab) => (
                  <CarouselItem
                    key={tab.id}
                    className="basis-auto first:ml-4 md:first:ml-8"
                  >
                    <GridTabCardContent
                      minimalTab={tab}
                      currentUser={currentUser}
                      color={color}
                      theme={theme}
                      pathname={pathname}
                      screenshotRenderer={screenshotRenderer}
                      animateOnMount={false}
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
