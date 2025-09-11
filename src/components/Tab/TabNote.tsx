import { useState } from "react";
import { useTabStore, type Section } from "~/stores/TabStore";
import { Input } from "~/components/ui/input";
import {
  handleTabNoteChange,
  handleTabNoteKeyDown,
} from "~/utils/tabNoteHandlers";
import type { Updater } from "use-immer";

interface TabNote {
  note: string;
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
  noteIndex: number;
  tabData: Section[];
  setTabData: Updater<Section[]>;
}

function TabNote({
  note,
  sectionIndex,
  subSectionIndex,
  columnIndex,
  noteIndex,
  tabData,
  setTabData,
}: TabNote) {
  const {
    currentlyCopiedChord,
    setCurrentlyCopiedChord,
    chordPulse,
    setChordPulse,
  } = useTabStore((state) => ({
    currentlyCopiedChord: state.currentlyCopiedChord,
    setCurrentlyCopiedChord: state.setCurrentlyCopiedChord,
    chordPulse: state.chordPulse,
    setChordPulse: state.setChordPulse,
  }));

  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={`relative ${
        chordPulse &&
        chordPulse.location.sectionIndex === sectionIndex &&
        chordPulse.location.subSectionIndex === subSectionIndex &&
        chordPulse.location.chordIndex === columnIndex
          ? "copyAndPaste"
          : ""
      }`}
      onAnimationEnd={() => setChordPulse(null)}
    >
      <Input
        id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${noteIndex}`}
        style={{
          width: noteIndex !== 7 ? "35px" : "29px",
          height: noteIndex !== 7 ? "35px" : "29px",
          borderWidth: note.length > 0 && !isFocused ? "2px" : "1px",
        }}
        className="relative my-[1px] rounded-full p-0 text-center shadow-sm"
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
          handleTabNoteKeyDown(e, {
            note,
            sectionIndex,
            subSectionIndex,
            columnIndex,
            noteIndex,
            tabData,
            setTabData,
            currentlyCopiedChord,
            setCurrentlyCopiedChord,
            chordPulse,
            setChordPulse,
            setIsFocused,
          });
        }}
        onChange={(e) => {
          handleTabNoteChange(e, {
            noteIndex,
            sectionIndex,
            subSectionIndex,
            columnIndex,
            tabData,
            setTabData,
          });
        }}
      />
    </div>
  );
}

export default TabNote;
