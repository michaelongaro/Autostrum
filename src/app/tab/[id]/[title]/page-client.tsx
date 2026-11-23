"use client";

import superjson from "superjson";
import { useMemo } from "react";
import RelatedTabs from "~/components/Tab/Static/RelatedTabs";
import StaticTab from "~/components/Tab/Static/StaticTab";
import { useHydrateTabStore } from "~/hooks/useHydrateTabStore";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import type { getTabPageData } from "~/server/tabPage";
import { TabStoreSnapshotContext } from "~/stores/TabStore";

type TabPageData = NonNullable<Awaited<ReturnType<typeof getTabPageData>>>;

export default function ViewIndividualTab({
  tabJson,
  relatedTabSections,
  relatedArtist,
}: Pick<TabPageData, "relatedTabSections" | "relatedArtist"> & {
  tabJson: string;
}) {
  const tab = useMemo(
    () => superjson.parse<TabWithArtistMetadata>(tabJson),
    [tabJson],
  );
  const snapshot = useHydrateTabStore(tab);

  return (
    <div className="baseVertFlex my-12 min-h-[650px] w-full !justify-start md:my-24 md:w-[85%] md:p-0 2xl:w-[70%]">
      <TabStoreSnapshotContext.Provider value={snapshot}>
        <StaticTab key={tab.id} />
      </TabStoreSnapshotContext.Provider>
      <RelatedTabs sections={relatedTabSections} artist={relatedArtist} />
    </div>
  );
}
