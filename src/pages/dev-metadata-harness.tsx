// Dev-only fixture for checking metadata layout and transitions. Never writes tab data
// to the server. ?count=1 tests a single row; ?count=12 tests wrapping/overflow.
import ErrorPage from "next/error";
import { useRouter } from "next/router";
import { useEffect } from "react";
import DesktopExtraTabMetadata from "~/components/Tab/DesktopExtraTabMetadata";
import MobileExtraTabMetadata from "~/components/Tab/MobileExtraTabMetadata";
import { useTabStore, useTabStoreApi } from "~/stores/TabStore";
import { createStrum } from "~/utils/tabNoteHelpers";

export default function DevMetadataHarness() {
  const { query, isReady } = useRouter();
  const store = useTabStoreApi();
  const chords = useTabStore((state) => state.chords);
  const count = Math.max(0, Math.min(24, Number(query.count ?? 12)));
  const ready =
    isReady &&
    chords.length === count &&
    (count === 0 || chords[0]?.id === "chord-0");

  useEffect(() => {
    if (!isReady || process.env.NODE_ENV === "production") return;
    store.setState({
      sectionProgression: Array.from({ length: count }, (_, index) => ({
        id: `progression-${index}`,
        sectionId: `section-${index}`,
        title: `Section ${index + 1}`,
        repetitions: 1,
        startSeconds: index * 10,
        endSeconds: (index + 1) * 10,
      })),
      chords: Array.from({ length: count }, (_, index) => ({
        id: `chord-${index}`,
        name:
          index === 0 && query.long
            ? "Cmaj7add13/E"
            : ["C", "G", "Am"][index % 3]!,
        color: "#ef4444",
        frets: ["0", "1", "0", "2", "3", "x"],
      })),
      strummingPatterns: Array.from({ length: count }, (_, index) => ({
        id: `pattern-${index}`,
        baseNoteLength: "eighth",
        strums: Array.from({ length: 4 }, (_, beat) =>
          createStrum({
            strum: beat % 2 === 0 ? "v" : "^",
            noteLength: "eighth",
            palmMute:
              index === 0 && query.long
                ? beat === 0
                  ? "start"
                  : beat === 3
                    ? "end"
                    : "-"
                : "",
          }),
        ),
      })),
    });
  }, [store, isReady, count, query.long]);

  if (process.env.NODE_ENV === "production")
    return <ErrorPage statusCode={404} />;

  return (
    <div
      className="baseVertFlex w-full py-8"
      id="devMetadataHarness"
      data-ready={ready}
    >
      {ready &&
        (query.mobile ? (
          <MobileExtraTabMetadata />
        ) : (
          <DesktopExtraTabMetadata />
        ))}
      <div data-metadata-after className="mt-4 h-64 w-full border-t p-4">
        Tab content below metadata
      </div>
    </div>
  );
}
