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
// - zoom=0.5..1.5             writes autostrum-zoom before render so the
//                             section CSS zoom matches (default: 1)
import ErrorPage from "next/error";
import { useRouter } from "next/router";
import { useEffect } from "react";
import StaticTab from "~/components/Tab/Static/StaticTab";
import StaticSectionContainer from "~/components/Tab/Static/StaticSectionContainer";
import {
  useTabStore,
  type Section,
  type TabNote,
  type TabMeasureLine,
} from "~/stores/TabStore";

function note(id: string, palmMute: TabNote["palmMute"] = ""): TabNote {
  return {
    type: "note",
    palmMute,
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

function measureLine(
  id: string,
  options?: { bpmAfterLine?: number | null; isInPalmMuteSection?: boolean },
): TabMeasureLine {
  return {
    type: "measureLine",
    isInPalmMuteSection: options?.isInPalmMuteSection ?? false,
    bpmAfterLine: options?.bpmAfterLine ?? null,
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

function makeBpmStickyColumns(): (TabNote | TabMeasureLine)[] {
  // notes @75 → ML 120 (show) → notes @120 → ML null (hide) →
  // PM span with ML 140 (show) → ML null (hide)
  return [
    note("bpm-n0"),
    note("bpm-n1"),
    measureLine("bpm-m-120", { bpmAfterLine: 120 }),
    note("bpm-n2"),
    note("bpm-n3"),
    measureLine("bpm-m-sticky", { bpmAfterLine: null }),
    note("bpm-n4"),
    note("bpm-n5", "start"),
    note("bpm-n6", "-"),
    measureLine("bpm-m-140", {
      bpmAfterLine: 140,
      isInPalmMuteSection: true,
    }),
    note("bpm-n7", "-"),
    note("bpm-n8", "end"),
    measureLine("bpm-m-after", { bpmAfterLine: null }),
    note("bpm-n9"),
  ];
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

  if (fixture === "bpm") {
    return [
      {
        id: "bpm-section",
        title: "BPM sticky fixture",
        data: [
          {
            id: "bpm-sub",
            type: "tab" as const,
            bpm: -1,
            baseNoteLength: "quarter" as const,
            repetitions: 1,
            data: makeBpmStickyColumns(),
          },
        ],
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

  const { setId, setTabData, setBpm, color, theme, storeTabData } = useTabStore(
    (state) => ({
      setId: state.setId,
      setTabData: state.setTabData,
      setBpm: state.setBpm,
      color: state.color,
      theme: state.theme,
      storeTabData: state.tabData,
    }),
  );

  const fixture =
    typeof query.fixture === "string" ? query.fixture : "realistic";
  const tabData = buildFixture(fixture);

  const zoomParam =
    typeof query.zoom === "string" ? Number(query.zoom) : undefined;

  // ready once the fixture has landed in the store (mirrors how the real
  // tab page hydrates the store from a client-side effect)
  const ready = storeTabData[0]?.id === tabData[0]?.id;

  useEffect(() => {
    if (!isReady) return;

    // Apply zoom before hydrating tab data so StaticSectionContainer's first
    // mount reads the requested autostrum-zoom from localStorage.
    if (
      typeof zoomParam === "number" &&
      Number.isFinite(zoomParam) &&
      zoomParam > 0
    ) {
      try {
        window.localStorage.setItem("autostrum-zoom", String(zoomParam));
      } catch {
        // ignore quota / private-mode failures; harness still runs at default zoom
      }
    }

    setId(1);
    if (fixture === "bpm") {
      setBpm(75);
    }
    setTabData((draft) => {
      draft.splice(0, draft.length, ...tabData);
    });
  }, [isReady, tabData, setId, setTabData, setBpm, zoomParam, fixture]);

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
