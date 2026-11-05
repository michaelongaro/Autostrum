"use client";
import { useRouteLocation } from "~/hooks/useRouteLocation";

import { motion } from "framer-motion";

import superjson from "superjson";
import RelatedTabs from "~/components/Tab/Static/RelatedTabs";
import StaticTab from "~/components/Tab/Static/StaticTab";
import Binoculars from "~/components/ui/icons/Binoculars";
import { useHydrateTabStore } from "~/hooks/useHydrateTabStore";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import {
  type RelatedTabCandidate,
  type RelatedTabSection,
} from "~/utils/relatedTabs";

interface RelatedArtistLink {
  id: number;
  name: string;
}

interface PageData {
  tab: TabWithArtistMetadata | null;
  relatedTabSections: RelatedTabSection<RelatedTabCandidate>[];
  relatedArtist: RelatedArtistLink | null;
}

function ViewIndividualTab({ json }: { json: string }) {
  const { asPath } = useRouteLocation();

  const { tab, relatedTabSections, relatedArtist } =
    superjson.parse<PageData>(json);

  useHydrateTabStore({
    fetchedTab: tab,
  });

  return (
    <motion.div
      key={"viewingTab"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: asPath.includes("screenshot") ? 0 : 0.5 }}
      className="baseVertFlex my-12 min-h-[650px] w-full !justify-start md:my-24 md:w-[85%] md:p-0 2xl:w-[70%]"
    >
      {tab ? (
        <>
          <StaticTab />
          <RelatedTabs sections={relatedTabSections} artist={relatedArtist} />
        </>
      ) : (
        <TabNotFound />
      )}
    </motion.div>
  );
}

export default ViewIndividualTab;

function TabNotFound() {
  return (
    <motion.div
      key={"staticTabNotFound"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-12 min-h-[calc(100dvh-4rem-6rem)] w-full max-w-[1400px] md:my-24 md:min-h-[calc(100dvh-4rem-12rem)] md:w-3/4"
    >
      <div className="baseVertFlex my-auto w-10/12 gap-4 rounded-md border bg-background p-4 shadow-lg md:w-[500px]">
        <div className="baseFlex gap-3 sm:gap-4">
          <div className="baseVertFlex gap-2">
            <Binoculars className="size-6 sm:size-9" />
            <h1 className="text-xl font-bold sm:text-2xl">Tab not found</h1>
          </div>
        </div>
        <p className="text-center text-base sm:text-lg">
          The tab you are looking for does not exist. Please check the URL and
          try again.
        </p>
      </div>
    </motion.div>
  );
}
