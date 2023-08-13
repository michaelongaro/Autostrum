import { useState, useEffect } from "react";
import { type TabWithLikes } from "~/server/api/routers/tab";
import SectionContainer from "./SectionContainer";
import type { Chord, StrummingPattern, Section } from "~/stores/TabStore";

interface TabPreview {
  tab: TabWithLikes | undefined | null;
  scale: number;
}

function TabPreview({ tab, scale }: TabPreview) {
  const [tabData, setTabData] = useState<Section[]>();
  const [chords, setChords] = useState<Chord[]>([]);
  const [strummingPatterns, setStrummingPatterns] = useState<
    StrummingPattern[]
  >([]);

  useEffect(() => {
    if (tab) {
      // @ts-expect-error can't specify type from prisma Json value, but we know it's correct
      setTabData(tab.tabData);
      // @ts-expect-error can't specify type from prisma Json value, but we know it's correct
      setChords(tab.chords);
      // @ts-expect-error can't specify type from prisma Json value, but we know it's correct
      setStrummingPatterns(tab.strummingPatterns);
    }
  }, [tab]);

  // debugger;

  return (
    <>
      {!tab && <div className="h-full w-full animate-pulse rounded-t-md"></div>}

      {tab && tabData && (
        <div
          style={{
            transform: `scale(${scale})`,
          }}
          className="pointer-events-none absolute left-0 top-0 z-[-1] mt-2 w-[1200px] origin-top-left select-none"
        >
          {tabData.map((section, index) => (
            <SectionContainer
              key={index}
              sectionIndex={index}
              sectionData={section}
              // overriddenChords={chords}
              // overriddenStrummingPatterns={strummingPatterns}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default TabPreview;
