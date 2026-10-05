// Dev-only harness for note-length beam grouping and flag width.
// Exercised by scripts/verifyNoteLengthBeaming.mjs; returns 404 in production.
import ErrorPage from "next/error";
import type { FullNoteLengths } from "~/stores/TabStore";
import { resolveBeamBreaks } from "~/utils/noteLengthBeamingCore";
import renderNoteLengthGuide from "~/utils/renderNoteLengthGuide";

type LengthSpec = "e" | "s" | "q" | "de" | "h" | "r";

const LENGTHS: Record<Exclude<LengthSpec, "r">, FullNoteLengths> = {
  e: "eighth",
  s: "sixteenth",
  q: "quarter",
  de: "eighth dotted",
  h: "half",
};

function BeamRow({
  id,
  label,
  pattern,
  columnWidth,
}: {
  id: string;
  label: string;
  pattern: LengthSpec[];
  columnWidth: number;
}) {
  const lengths = pattern.map((token) =>
    token === "r" ? "eighth" : LENGTHS[token],
  );
  const rests = pattern.map((token) => token === "r");
  const breaks = resolveBeamBreaks(
    lengths.map((noteLength, index) => ({
      noteLength,
      isRest: rests[index] ?? false,
    })),
  );

  return (
    <section data-beam-row={id} className="mb-6">
      <h2 className="mb-2 text-sm font-medium">{label}</h2>
      <div className="flex">
        {lengths.map((noteLength, index) => (
          <div
            key={`${id}-${index}`}
            data-beam-column={index}
            style={{ width: columnWidth }}
            className="relative h-4"
          >
            {renderNoteLengthGuide({
              previousNoteLength: lengths[index - 1],
              currentNoteLength: noteLength,
              nextNoteLength: lengths[index + 1],
              previousIsRestStrum: rests[index - 1],
              currentIsRestStrum: rests[index],
              nextIsRestStrum: rests[index + 1],
              isFirstInGroup: index === 0,
              isLastInGroup: index === lengths.length - 1,
              breakBeamWithPrevious: breaks[index]?.breakWithPrevious ?? true,
              breakBeamWithNext: breaks[index]?.breakWithNext ?? true,
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function DevBeamHarness() {
  if (process.env.NODE_ENV === "production") {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <div
      id="devBeamHarness"
      className="bg-background p-8 text-foreground"
      style={{ color: "hsl(var(--foreground))" }}
    >
      <BeamRow
        id="eight-eighths"
        label="Eight eighths — pairs"
        pattern={["e", "e", "e", "e", "e", "e", "e", "e"]}
        columnWidth={34}
      />
      <BeamRow
        id="eight-sixteenths"
        label="Eight sixteenths — groups of four"
        pattern={["s", "s", "s", "s", "s", "s", "s", "s"]}
        columnWidth={34}
      />
      <BeamRow
        id="shuffle"
        label="Dotted eighth + sixteenth, twice"
        pattern={["de", "s", "de", "s"]}
        columnWidth={34}
      />
      <BeamRow
        id="eighth-two-sixteenths"
        label="Eighth + two sixteenths, twice"
        pattern={["e", "s", "s", "e", "s", "s"]}
        columnWidth={34}
      />
      <BeamRow
        id="compound-cells"
        label="Repeated dotted-eighth, sixteenth, eighth"
        pattern={["de", "s", "e", "de", "s", "e"]}
        columnWidth={34}
      />
      <BeamRow
        id="rest-separated"
        label="Eighth pair, eighth rest, two eighths on different beats"
        pattern={["e", "e", "r", "e", "e"]}
        columnWidth={34}
      />
      <BeamRow
        id="orphan-flag"
        label="Quarter, lone eighth, quarter"
        pattern={["q", "e", "q"]}
        columnWidth={34}
      />
      <BeamRow
        id="editor-width-eighths"
        label="Eight eighths at editor column width"
        pattern={["e", "e", "e", "e", "e", "e", "e", "e"]}
        columnWidth={40}
      />
    </div>
  );
}

export default DevBeamHarness;
