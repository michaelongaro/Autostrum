import type { CSSProperties } from "react";
import type { COLORS, FullNoteLengths } from "~/stores/TabStore";
import { WholeNote, getDynamicNoteLengthIcon } from "~/utils/noteLengthIcons";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";

type NoteBase = "whole" | "half" | "quarter" | "eighth" | "sixteenth";

interface ParsedNote {
  base: NoteBase;
  dotCount: 0 | 1 | 2;
}

interface RenderStrummingGuideParams {
  previousNoteLength?: FullNoteLengths;
  currentNoteLength?: FullNoteLengths;
  nextNoteLength?: FullNoteLengths;
  previousIsRestStrum?: boolean;
  currentIsRestStrum?: boolean;
  nextIsRestStrum?: boolean;
  color?: COLORS;
  theme?: "light" | "dark";
}

function parseFullNoteLength(note: FullNoteLengths): ParsedNote {
  const base = note.split(" ")[0] as NoteBase;

  let dotCount: 0 | 1 | 2 = 0;
  if (note.includes("double-dotted")) {
    dotCount = 2;
  } else if (note.includes("dotted")) {
    dotCount = 1;
  }

  return {
    base,
    dotCount,
  };
}

function createBeamSegments(
  position: "left" | "right",
  offsets: number[],
  backgroundColor: string,
) {
  return offsets.map((offset) => {
    const style: CSSProperties = {
      bottom: offset,
      width: "50%",
      backgroundColor,
    };

    if (position === "left") {
      style.left = 0;
    } else {
      style.right = 0;
    }

    return (
      <div
        key={`${position}-${offset}`}
        style={style}
        className="absolute h-[3px]"
      ></div>
    );
  });
}

function renderDots(
  dotCount: 0 | 1 | 2,
  backgroundColor: string,
  placement: "default" | "centered" = "default",
) {
  if (dotCount === 0) {
    return null;
  }

  const placementClasses =
    placement === "centered"
      ? "absolute left-[70%] top-1/2 ml-[2px] -translate-y-1/2 flex gap-[2px]"
      : "absolute left-[55%] top-0 ml-[2px] flex gap-[2px]";

  return (
    <div className={placementClasses}>
      {Array.from({ length: dotCount }).map((_, index) => (
        <div
          key={`dot-${index}`}
          style={{ backgroundColor }}
          className="h-[3px] w-[3px] rounded-full"
        ></div>
      ))}
    </div>
  );
}

function renderStrummingGuide({
  previousNoteLength,
  currentNoteLength,
  nextNoteLength,
  previousIsRestStrum = false,
  currentIsRestStrum = false,
  nextIsRestStrum = false,
  color,
  theme,
}: RenderStrummingGuideParams) {
  // console.log(currentNoteLength);

  if (!currentNoteLength) {
    return null;
  }

  const themeKey = theme ?? "light";
  const noteColor =
    color && theme
      ? `hsl(${SCREENSHOT_COLORS[color][themeKey]["screenshot-foreground"]})`
      : "currentColor";

  if (currentIsRestStrum) {
    const restIcon = getDynamicNoteLengthIcon({
      noteLength: currentNoteLength,
      isARestNote: true,
    });

    if (!restIcon) {
      return null;
    }

    return (
      <div
        className="baseFlex relative size-full !flex-nowrap"
        style={{ color: noteColor }}
      >
        {restIcon}
      </div>
    );
  }

  const parsedCurrent = parseFullNoteLength(currentNoteLength);

  if (parsedCurrent.base === "whole") {
    return (
      <div
        className="baseFlex relative size-full !flex-nowrap"
        style={{ color: noteColor }}
      >
        <WholeNote className="h-[10px] w-[12px]" />
        {renderDots(parsedCurrent.dotCount, noteColor, "centered")}
      </div>
    );
  }

  const isHalfNote = parsedCurrent.base === "half";

  const verticalStem = (
    <div
      className={`w-[1px] rounded-md ${isHalfNote ? "h-1/2 self-start" : "h-full"}`}
      style={{ backgroundColor: noteColor }}
    ></div>
  );

  const supportsBeams =
    parsedCurrent.base === "eighth" || parsedCurrent.base === "sixteenth";
  const parsedPrev =
    supportsBeams && previousNoteLength && !previousIsRestStrum
      ? parseFullNoteLength(previousNoteLength)
      : null;
  const parsedNext =
    supportsBeams && nextNoteLength && !nextIsRestStrum
      ? parseFullNoteLength(nextNoteLength)
      : null;

  const connectsLeft =
    (parsedPrev?.base === "eighth" || parsedPrev?.base === "sixteenth") &&
    (parsedCurrent?.base === "eighth" || parsedCurrent?.base === "sixteenth");
  const connectsRight =
    (parsedNext?.base === "eighth" || parsedNext?.base === "sixteenth") &&
    (parsedCurrent?.base === "eighth" || parsedCurrent?.base === "sixteenth");

  const beamOffsets = parsedCurrent.base === "sixteenth" ? [5, 0] : [0];
  const leftBeams = connectsLeft
    ? createBeamSegments("left", beamOffsets, noteColor)
    : null;
  const shouldShowRightBeams =
    supportsBeams && (connectsRight || !connectsLeft);
  const rightBeams = shouldShowRightBeams
    ? createBeamSegments("right", beamOffsets, noteColor)
    : null;

  return (
    <div className="baseFlex relative size-full !flex-nowrap">
      {verticalStem}
      {leftBeams}
      {rightBeams}
      {renderDots(
        parsedCurrent.dotCount,
        noteColor,
        isHalfNote ? "centered" : "default",
      )}
    </div>
  );
}

export default renderStrummingGuide;
