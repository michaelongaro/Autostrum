import { getDisplayTuningNotes } from "~/utils/tunings";

function PrettyNote({
  note,
  displayWithFlex,
  showScientificPitchNotation,
}: {
  note: string;
  displayWithFlex?: boolean;
  showScientificPitchNotation?: boolean;
}) {
  const regex = /^(?<letter>[A-G])(?<accidental>#?)(?<octave>\d+)?$/i;
  const noteMatch = regex.exec(note);
  const letter = noteMatch?.groups?.letter ?? note[0] ?? "";
  const accidental = noteMatch?.groups?.accidental ?? "";
  const octave = showScientificPitchNotation
    ? noteMatch?.groups?.octave
    : undefined;

  return (
    <div className="baseFlex relative">
      <p>{letter}</p>
      {accidental === "#" && (
        <div
          className={`relative top-[-3px] text-xs italic ${displayWithFlex ? "w-[8px]" : "w-[10px]"} text-center`}
        >
          <p>#</p>
        </div>
      )}
      {octave && <p>{octave}</p>}
    </div>
  );
}

function PrettyTuning({
  tuning,
  width,
  displayWithFlex,
  showScientificPitchNotation,
}: {
  tuning?: string | null;
  width?: string;
  displayWithFlex?: boolean;
  showScientificPitchNotation?: boolean;
}) {
  const notes = getDisplayTuningNotes(tuning);

  return (
    <div
      className={`${displayWithFlex ? `baseFlex whitespace-nowrap ${showScientificPitchNotation ? "gap-1.5 text-sm" : "gap-1"}` : "grid grid-cols-6 !place-items-start"} ${width}`}
    >
      {notes.map((note, index) => (
        <PrettyNote
          key={`${tuning}-${index}`}
          note={note.toUpperCase()}
          displayWithFlex={displayWithFlex}
          showScientificPitchNotation={showScientificPitchNotation}
        />
      ))}
    </div>
  );
}

// used to render tuning on tab sections
function PrettyVerticalTuning({
  tuning,
  height,
}: {
  tuning?: string | null;
  height: string;
}) {
  const notes = getDisplayTuningNotes(tuning);

  return (
    <div
      style={{ height }}
      className={`baseVertFlex !items-start !justify-between ${notes.toString().includes("#") ? "w-4" : "w-3"}`}
    >
      {notes.toReversed().map((note, index) => (
        <PrettyNote key={`${tuning}-${index}`} note={note.toUpperCase()} />
      ))}
    </div>
  );
}

export { PrettyNote, PrettyTuning, PrettyVerticalTuning };
