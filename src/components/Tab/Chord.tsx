import { useTabStore, type Chord as ChordType } from "~/stores/TabStore";
import { Input } from "~/components/ui/input";
import { PrettyVerticalTuning } from "~/components/ui/PrettyTuning";
import { cn } from "~/utils/cn";
import {
  EDITING_TAB_COLUMN_WIDTH_PX,
  EDITING_TAB_STAFF_LINE_HEIGHT_PX,
  EDITING_TAB_STAFF_LINE_INSET_PX,
  EDITING_TAB_STRING_ROW_HEIGHT_PX,
} from "~/utils/editingTabGeometry";

interface Chord {
  chordBeingEdited: { index: number; value: ChordType };
  highlightChord: boolean;
}

function ChordNoteInput({
  fret,
  index,
  highlightChord,
  onKeyDown,
  onChange,
}: {
  fret: string;
  index: number;
  highlightChord: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
}) {
  const hasVisibleNote = fret.length > 0;
  const noteColor = highlightChord
    ? "hsl(var(--primary))"
    : "hsl(var(--foreground))";

  // Match TabNote: empty notes fill the row (easy click target); filled notes
  // shrink to the text so flanking string segments claim the remaining width.
  // Hover border stays a centered 29x24 box independent of input width.
  const noteWidth = hasVisibleNote ? `${Math.max(fret.length, 1)}ch` : "100%";

  return (
    <div
      className={cn(
        hasVisibleNote && "relative z-[1] shrink-0",
        !hasVisibleNote && "absolute inset-0 z-[1]",
        "group",
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[24px] w-[29px] -translate-x-1/2 -translate-y-1/2 rounded-md group-hover:border"
      />
      <Input
        id={`input-chordModal-chordModal-${index}`}
        showFocusState={false}
        type="text"
        autoComplete="off"
        value={fret}
        onKeyDown={(e) => onKeyDown(e, index)}
        onChange={(e) => onChange(e, index)}
        style={{
          width: noteWidth,
          height: "24px",
          color: noteColor,
        }}
        className="relative z-[1] h-full rounded-none border-0 bg-transparent p-0 text-center font-normal tabular-nums leading-none shadow-none outline-none transition-none focus-visible:outline-none focus-visible:ring-0"
        onFocus={(e) => {
          // focuses end of the input (better ux when navigating with arrow keys)
          e.target.setSelectionRange(
            e.target.value.length,
            e.target.value.length,
          );
        }}
      />
    </div>
  );
}

function Chord({ chordBeingEdited, highlightChord }: Chord) {
  const { tuning, setChordBeingEdited } = useTabStore((state) => ({
    tuning: state.tuning,
    setChordBeingEdited: state.setChordBeingEdited,
  }));

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (e.key === "ArrowDown") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-chordModal-chordModal-${index + 1}`,
      );

      newNoteToFocus?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-chordModal-chordModal-${index - 1}`,
      );

      newNoteToFocus?.focus();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const value = e.target.value;

    // regular notes
    // wanted to always allow a-g in regular note even if there was a number
    // present for easy placement of chords
    let valueHasAChordLetter = false;
    let chordLetter = "";
    for (let i = 0; i < value.length; i++) {
      if ("abcdefgABCDEFG".includes(value.charAt(i))) {
        valueHasAChordLetter = true;
        chordLetter = value.charAt(i);
        break;
      }
    }
    if (valueHasAChordLetter) {
      // capital letter means major chord
      // lowercase letter means minor chord

      let chordArray: string[] = [];
      if (chordLetter === "A") {
        chordArray = ["", "0", "2", "2", "2", "0"];
      } else if (chordLetter === "a") {
        chordArray = ["", "0", "2", "2", "1", "0"];
      } else if (chordLetter === "B") {
        chordArray = ["", "2", "4", "4", "4", "2"];
      } else if (chordLetter === "b") {
        chordArray = ["", "2", "4", "4", "3", "2"];
      } else if (chordLetter === "C") {
        chordArray = ["", "3", "2", "0", "1", "0"];
      } else if (chordLetter === "c") {
        chordArray = ["", "3", "5", "5", "4", "3"];
      } else if (chordLetter === "D") {
        chordArray = ["", "", "0", "2", "3", "2"];
      } else if (chordLetter === "d") {
        chordArray = ["", "", "0", "2", "3", "1"];
      } else if (chordLetter === "E") {
        chordArray = ["0", "2", "2", "1", "0", "0"];
      } else if (chordLetter === "e") {
        chordArray = ["0", "2", "2", "0", "0", "0"];
      } else if (chordLetter === "F") {
        chordArray = ["1", "3", "3", "2", "1", "1"];
      } else if (chordLetter === "f") {
        chordArray = ["1", "3", "3", "1", "1", "1"];
      } else if (chordLetter === "G") {
        chordArray = ["3", "2", "0", "0", "0", "3"];
      } else if (chordLetter === "g") {
        chordArray = ["3", "5", "5", "3", "3", "3"];
      }

      setChordBeingEdited({
        ...chordBeingEdited,
        value: {
          ...chordBeingEdited.value,
          frets: chordArray.reverse(),
        },
      });

      return;
    }

    // allows 0-22 or a (case insensitive) x for a muted string
    const numberPattern = /^(?:[1-9]|1[0-9]|2[0-2]|0|x|X)$/;

    if (value !== "" && !numberPattern.test(value)) return;

    const newChordData = [...chordBeingEdited.value.frets];

    newChordData[index] = value;

    setChordBeingEdited({
      ...chordBeingEdited,
      value: {
        ...chordBeingEdited.value,
        frets: newChordData,
      },
    });

    return;
  }

  return (
    <div className="baseFlex !items-start">
      <div className="pr-2">
        <PrettyVerticalTuning
          tuning={tuning}
          height={`${EDITING_TAB_STAFF_LINE_HEIGHT_PX}px`}
        />
      </div>

      <div
        className="shrink-0 bg-foreground/50"
        style={{
          width: 1,
          height: EDITING_TAB_STAFF_LINE_HEIGHT_PX,
          marginTop: EDITING_TAB_STAFF_LINE_INSET_PX,
        }}
      />

      <div
        className="baseVertFlex"
        style={{ width: EDITING_TAB_COLUMN_WIDTH_PX }}
      >
        {chordBeingEdited.value.frets.map((fret, index) => (
          <div
            key={index}
            style={{
              height: EDITING_TAB_STRING_ROW_HEIGHT_PX,
              minHeight: EDITING_TAB_STRING_ROW_HEIGHT_PX,
              width: EDITING_TAB_COLUMN_WIDTH_PX,
            }}
            className="baseFlex relative"
          >
            <div className="h-[1px] min-w-[2px] flex-[1] bg-foreground/50"></div>

            <ChordNoteInput
              fret={fret}
              index={index}
              highlightChord={highlightChord}
              onKeyDown={handleKeyDown}
              onChange={handleChange}
            />

            <div className="h-[1px] min-w-[2px] flex-[1] bg-foreground/50"></div>
          </div>
        ))}
      </div>

      <div
        className="shrink-0 bg-foreground/50"
        style={{
          width: 1,
          height: EDITING_TAB_STAFF_LINE_HEIGHT_PX,
          marginTop: EDITING_TAB_STAFF_LINE_INSET_PX,
        }}
      />
    </div>
  );
}

export default Chord;
