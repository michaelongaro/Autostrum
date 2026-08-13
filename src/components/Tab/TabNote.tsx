import { getTabStore, useTabStore } from "~/stores/TabStore";
import { Input } from "~/components/ui/input";
import {
  handleTabNoteChange,
  handleTabNoteKeyDown,
} from "~/utils/tabNoteHandlers";
import { cn } from "~/utils/cn";

interface TabNote {
  note: string;
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
  noteIndex: number;
}

function TabNote({
  note,
  sectionIndex,
  subSectionIndex,
  columnIndex,
  noteIndex,
}: TabNote) {
  const setTabData = useTabStore((state) => state.setTabData);
  const setChordPulse = useTabStore((state) => state.setChordPulse);

  // Only this column's pulse should re-render the input chrome.
  const isPulsing = useTabStore((state) => {
    const pulse = state.chordPulse;
    return (
      pulse?.location.sectionIndex === sectionIndex &&
      pulse.location.subSectionIndex === subSectionIndex &&
      pulse.location.chordIndex === columnIndex
    );
  });

  const isChordEffect = noteIndex === 7;
  const hasVisibleNote = note.length > 0;

  return (
    <div
      className={cn(
        isPulsing && "copyAndPaste",
        isChordEffect && "relative",
        !isChordEffect && hasVisibleNote && "relative z-[1] shrink-0",
        !isChordEffect && !hasVisibleNote && "absolute inset-0 z-[1]",
        "group",
      )}
      onAnimationEnd={() => setChordPulse(null)}
    >
      <div
        className={`pointer-events-none absolute isolate size-[29px] rounded-md group-hover:border ${isChordEffect ? "right-0" : `top-[0px] ${hasVisibleNote ? "right-0" : "right-[10px]"}`}`}
      ></div>
      <Input
        id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${noteIndex}`}
        showFocusState={isChordEffect}
        style={
          isChordEffect
            ? {
                width: "29px",
                height: "29px",
              }
            : {
                width: hasVisibleNote
                  ? // ? `${Math.max(note.length, 1)}ch`
                    "29px"
                  : "100%",
                height: "29px",
              }
        }
        className={
          isChordEffect
            ? `relative rounded-md p-0 text-center shadow-sm`
            : "h-full rounded-none border-0 bg-transparent p-0 text-center font-normal tabular-nums leading-none shadow-none outline-none focus-visible:outline-none focus-visible:ring-0"
        }
        onFocus={(e) => {
          // focuses end of the input (better ux when navigating with arrow keys)
          e.target.setSelectionRange(
            e.target.value.length,
            e.target.value.length,
          );
        }}
        type="text"
        autoComplete="off"
        value={note}
        onKeyDown={(e) => {
          const {
            currentlyCopiedChord,
            setCurrentlyCopiedChord,
            chordPulse,
            setChordPulse: setPulse,
          } = getTabStore();

          handleTabNoteKeyDown(e, {
            note,
            sectionIndex,
            subSectionIndex,
            columnIndex,
            setTabData,
            noteIndex,
            currentlyCopiedChord,
            setCurrentlyCopiedChord,
            chordPulse,
            setChordPulse: setPulse,
          });
        }}
        onChange={(e) => {
          handleTabNoteChange(e, {
            noteIndex,
            sectionIndex,
            subSectionIndex,
            columnIndex,
            setTabData,
          });
        }}
      />
    </div>
  );
}

export default TabNote;
