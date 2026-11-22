"use client";

import superjson from "superjson";
import RelatedTabs from "~/components/Tab/Static/RelatedTabs";
import StaticTab from "~/components/Tab/Static/StaticTab";
import { useHydrateTabStore } from "~/hooks/useHydrateTabStore";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import type { getTabPageData } from "~/server/tabPage";

type TabPageData = NonNullable<Awaited<ReturnType<typeof getTabPageData>>>;

export default function ViewIndividualTab({
  tabJson,
  arrangement,
  relatedTabSections,
  relatedArtist,
}: Pick<TabPageData, "arrangement" | "relatedTabSections" | "relatedArtist"> & {
  tabJson: string;
}) {
  const tab = superjson.parse<TabWithArtistMetadata>(tabJson);
  useHydrateTabStore({ fetchedTab: tab });

  return (
    <div className="baseVertFlex my-12 min-h-[650px] w-full !justify-start md:my-24 md:w-[85%] md:p-0 2xl:w-[70%]">
      <StaticTab publishedTab={tab} arrangement={arrangement} />
      <RelatedTabs sections={relatedTabSections} artist={relatedArtist} />
    </div>
  );
}
