import { useState } from "react";
import { getTabStore, useTabStore } from "~/stores/TabStore";
import { Input } from "~/components/ui/input";
import {
  handleTabNoteChange,
  handleTabNoteKeyDown,
} from "~/utils/tabNoteHandlers";

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

  const [isFocused, setIsFocused] = useState(false);

  const isChordEffect = noteIndex === 7;
  const hasVisibleNote = note.length > 0;

  return (
    <div
      className={`relative ${isPulsing ? "copyAndPaste" : ""} ${
        !isChordEffect && !hasVisibleNote
          ? "absolute inset-0 z-[1]"
          : !isChordEffect
            ? "z-[1] shrink-0"
            : ""
      }`}
      onAnimationEnd={() => setChordPulse(null)}
    >
      <Input
        id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${noteIndex}`}
        showFocusState={isChordEffect}
        style={
          isChordEffect
            ? {
                width: "29px",
                height: "29px",
                borderWidth: note.length > 0 && !isFocused ? "2px" : "1px",
              }
            : {
                width: hasVisibleNote
                  ? `calc(${Math.max(note.length, 1)}ch + 6px)`
                  : "100%",
                height: hasVisibleNote ? "35px" : "100%",
              }
        }
        className={
          isChordEffect
            ? "relative rounded-full p-0 text-center shadow-sm"
            : "rounded-none border-0 bg-transparent p-0 text-center font-normal tabular-nums shadow-none outline-none focus-visible:outline-none focus-visible:ring-0"
        }
        onFocus={(e) => {
          setIsFocused(true);

          // focuses end of the input (better ux when navigating with arrow keys)
          e.target.setSelectionRange(
            e.target.value.length,
            e.target.value.length,
          );
        }}
        onBlur={() => {
          setIsFocused(false);
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
            setIsFocused,
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
