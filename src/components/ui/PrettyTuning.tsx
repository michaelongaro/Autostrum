import { getDisplayTuningNotes } from "~/utils/tunings";
import {
  STATIC_TAB_VERTICAL_TUNING_ACCIDENTAL_WIDTH_PX,
  STATIC_TAB_VERTICAL_TUNING_WIDTH_PX,
} from "~/utils/staticTabGeometry";

function PrettyNote({
  note,
  displayWithFlex,
  showScientificPitchNotation,
  noteClass = "text-sm",
  accidentalClass = "text-xs",
}: {
  note: string;
  displayWithFlex?: boolean;
  showScientificPitchNotation?: boolean;
  noteClass?: string;
  accidentalClass?: string;
}) {
  const regex = /^(?<letter>[A-G])(?<accidental>#?)(?<octave>\d+)?$/i;
  const noteMatch = regex.exec(note);
  const letter = noteMatch?.groups?.letter ?? note[0] ?? "";
  const accidental = noteMatch?.groups?.accidental ?? "";
  const octave = showScientificPitchNotation
    ? noteMatch?.groups?.octave
    : undefined;

  return (
    <div className={`baseFlex relative ${noteClass}`}>
      <p>{letter}</p>
      {accidental === "#" && (
        <div
          className={`relative top-[-3px] italic ${displayWithFlex ? "w-[8px]" : "w-[10px]"} text-center ${accidentalClass}`}
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
  color,
  noteClass = "text-sm",
  accidentalClass = "text-xs",
}: {
  tuning?: string | null;
  width?: string;
  displayWithFlex?: boolean;
  showScientificPitchNotation?: boolean;
  color?: string;
  noteClass?: string;
  accidentalClass?: string;
}) {
  const notes = getDisplayTuningNotes(tuning);

  return (
    <div
      style={{
        color,
      }}
      className={`${displayWithFlex ? `baseFlex whitespace-nowrap ${showScientificPitchNotation ? "gap-1.5 text-sm" : "gap-1"}` : "grid grid-cols-6 !place-items-start"} ${width}`}
    >
      {notes.map((note, index) => (
        <PrettyNote
          key={`${tuning}-${index}`}
          note={note.toUpperCase()}
          displayWithFlex={displayWithFlex}
          showScientificPitchNotation={showScientificPitchNotation}
          noteClass={noteClass}
          accidentalClass={accidentalClass}
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
      style={{
        height,
        width: notes.toString().includes("#")
          ? STATIC_TAB_VERTICAL_TUNING_ACCIDENTAL_WIDTH_PX
          : STATIC_TAB_VERTICAL_TUNING_WIDTH_PX,
      }}
      className="baseVertFlex !items-start !justify-between"
    >
      {notes.toReversed().map((note, index) => (
        <PrettyNote
          key={`${tuning}-${index}`}
          note={note.toUpperCase()}
          noteClass="text-base"
          accidentalClass="text-sm"
        />
      ))}
    </div>
  );
}

export { PrettyNote, PrettyTuning, PrettyVerticalTuning };
