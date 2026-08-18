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
  /** Playback-modal-style primary coloring for frets under the playhead trail. */
  isHighlighted?: boolean;
}

function TabNote({
  note,
  sectionIndex,
  subSectionIndex,
  columnIndex,
  noteIndex,
  isHighlighted = false,
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
  const noteColor = isHighlighted
    ? "hsl(var(--primary))"
    : "hsl(var(--foreground))";

  // Empty string notes fill the row (easy click target). Filled notes shrink to
  // the text so the flanking string segments claim the remaining width. In both
  // cases TabNote is centered in the column, so a centered 29x24 hover border
  // stays on the column midpoint without tying its box to the input width.
  const stringNoteWidth = hasVisibleNote
    ? `${Math.max(note.length, 1)}ch`
    : "100%";

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
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[24px] w-[29px] -translate-x-1/2 -translate-y-1/2 rounded-md group-hover:border"
      />
      <Input
        id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${noteIndex}`}
        showFocusState={isChordEffect}
        style={
          isChordEffect
            ? {
                width: "29px",
                height: "24px",
                color: noteColor,
              }
            : {
                width: stringNoteWidth,
                height: "24px",
                color: noteColor,
              }
        }
        className={
          isChordEffect
            ? "relative z-[1] rounded-md bg-background p-0 text-center shadow-sm transition-none"
            : "relative z-[1] h-full rounded-none border-0 bg-transparent p-0 text-center font-normal tabular-nums leading-none shadow-none outline-none transition-none focus-visible:outline-none focus-visible:ring-0"
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
