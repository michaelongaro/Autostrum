// Dev-only harness page for verifying static tab row virtualization.
// Exercised by scripts/verifyStaticTabVirtualization.mjs; returns 404 in
// production builds.
//
// Query params:
// - fixture=realistic | huge  (default: realistic)
//     realistic: 10 sections x 2 subsections x 8 measures (typical long tab)
//     huge:      one section with a single 100-measure subsection
// - virtualized=false         disables virtualization (baseline full render)
// - bare=1                    renders StaticSectionContainers directly
//                             (no StaticTab chrome) for 1:1 geometry parity
import ErrorPage from "next/error";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import StaticTab from "~/components/Tab/Static/StaticTab";
import StaticSectionContainer from "~/components/Tab/Static/StaticSectionContainer";
import {
  useTabStore,
  type Section,
  type TabNote,
  type TabMeasureLine,
} from "~/stores/TabStore";

function note(id: string): TabNote {
  return {
    type: "note",
    palmMute: "",
    firstString: "",
    secondString: "3",
    thirdString: "2",
    fourthString: "0",
    fifthString: "",
    sixthString: "",
    chordEffects: "",
    noteLength: "quarter",
    id,
  };
}

function measureLine(id: string): TabMeasureLine {
  return {
    type: "measureLine",
    isInPalmMuteSection: false,
    bpmAfterLine: null,
    id,
  };
}

function makeColumns(prefix: string, measures: number) {
  const columns: (TabNote | TabMeasureLine)[] = [];
  for (let m = 0; m < measures; m++) {
    for (let n = 0; n < 8; n++) {
      columns.push(note(`${prefix}-n-${m}-${n}`));
    }
    if (m < measures - 1) {
      columns.push(measureLine(`${prefix}-ml-${m}`));
    }
  }
  return columns;
}

function makeTabSection(id: string, measures: number) {
  return {
    id,
    type: "tab" as const,
    bpm: 120,
    baseNoteLength: "quarter" as const,
    repetitions: 1,
    data: makeColumns(id, measures),
  };
}

function buildFixture(fixture: string): Section[] {
  if (fixture === "huge") {
    return [
      {
        id: "huge-section",
        title: "Huge section",
        data: [makeTabSection("huge-sub", 100)],
      },
    ];
  }

  // realistic: a long tab made of many modest subsections
  return Array.from({ length: 10 }, (_, sectionIndex) => ({
    id: `section-${sectionIndex}`,
    title: `Section ${sectionIndex + 1}`,
    data: [
      makeTabSection(`sub-${sectionIndex}-0`, 8),
      makeTabSection(`sub-${sectionIndex}-1`, 8),
    ],
  }));
}

export default function DevVirtualizationHarness() {
  const { query, isReady } = useRouter();

  const { setId, setTabData, color, theme, storeTabData } = useTabStore(
    (state) => ({
      setId: state.setId,
      setTabData: state.setTabData,
      color: state.color,
      theme: state.theme,
      storeTabData: state.tabData,
    }),
  );

  const fixture =
    typeof query.fixture === "string" ? query.fixture : "realistic";
  const tabData = useMemo(() => buildFixture(fixture), [fixture]);

  // ready once the fixture has landed in the store (mirrors how the real
  // tab page hydrates the store from a client-side effect)
  const ready = storeTabData[0]?.id === tabData[0]?.id;

  useEffect(() => {
    if (!isReady) return;

    setId(1);
    setTabData((draft) => {
      draft.splice(0, draft.length, ...tabData);
    });
  }, [isReady, tabData, setId, setTabData]);

  // NODE_ENV is inlined at build time; this page only exists in dev
  if (process.env.NODE_ENV === "production") {
    return <ErrorPage statusCode={404} />;
  }

  const virtualized = query.virtualized !== "false";

  if (query.bare) {
    return (
      <div id="devVirtualizationHarness" data-ready={ready} className="w-full">
        {ready &&
          tabData.map((section, index) => (
            <div key={section.id} className="baseFlex w-full">
              <StaticSectionContainer
                sectionIndex={index}
                sectionData={section}
                color={color}
                theme={theme}
                tabDataLength={tabData.length}
                virtualized={virtualized}
              />
            </div>
          ))}
      </div>
    );
  }

  return (
    <div id="devVirtualizationHarness" data-ready={ready} className="w-full">
      {ready && <StaticTab />}
    </div>
  );
}
