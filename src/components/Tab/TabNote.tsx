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

  return (
    <div
      className={`relative ${isPulsing ? "copyAndPaste" : ""}`}
      onAnimationEnd={() => setChordPulse(null)}
    >
      <Input
        id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${noteIndex}`}
        style={{
          width: noteIndex !== 7 ? "35px" : "29px",
          height: noteIndex !== 7 ? "35px" : "29px",
          borderWidth: note.length > 0 && !isFocused ? "2px" : "1px",
        }}
        className="relative rounded-full p-0 text-center shadow-sm"
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
