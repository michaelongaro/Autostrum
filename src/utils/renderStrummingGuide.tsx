import type { CSSProperties } from "react";
import type { COLORS, FullNoteLengths } from "~/stores/TabStore";
import { WholeNote, getDynamicNoteLengthIcon } from "~/utils/noteLengthIcons";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";

type NoteBase = "whole" | "half" | "quarter" | "eighth" | "sixteenth";

interface ParsedNote {
  base: NoteBase;
  dotCount: 0 | 1 | 2;
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

interface RenderStrummingGuide {
  previousNoteLength?: FullNoteLengths;
  currentNoteLength?: FullNoteLengths;
  nextNoteLength?: FullNoteLengths;
  previousIsRestStrum?: boolean;
  currentIsRestStrum?: boolean;
  nextIsRestStrum?: boolean;
  color?: COLORS;
  theme?: "light" | "dark";
  /** True if this is the first strum in a chord sequence or after a measure line */
  isFirstInGroup?: boolean;
  /** True if this is the last strum in a chord sequence or before a measure line */
  isLastInGroup?: boolean;
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
  isFirstInGroup = false,
  isLastInGroup = false,
}: RenderStrummingGuide) {
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

  // Determine if neighbors exist and what they are (respecting group boundaries)
  const hasPreviousNote =
    !isFirstInGroup && previousNoteLength && !previousIsRestStrum;
  const hasNextNote = !isLastInGroup && nextNoteLength && !nextIsRestStrum;

  const parsedPrev =
    supportsBeams && hasPreviousNote
      ? parseFullNoteLength(previousNoteLength)
      : null;
  const parsedNext =
    supportsBeams && hasNextNote ? parseFullNoteLength(nextNoteLength) : null;

  // Check if neighbors support beaming (eighth or sixteenth)
  const prevSupportsBeams =
    parsedPrev?.base === "eighth" || parsedPrev?.base === "sixteenth";
  const nextSupportsBeams =
    parsedNext?.base === "eighth" || parsedNext?.base === "sixteenth";

  // Check if neighbors are specifically sixteenth notes
  const prevIsSixteenth = parsedPrev?.base === "sixteenth";
  const nextIsSixteenth = parsedNext?.base === "sixteenth";

  // First beam (shared by eighth and sixteenth): connects to any beamable neighbor
  const connectsLeftFirstBeam = prevSupportsBeams;
  const connectsRightFirstBeam = nextSupportsBeams;

  // For eighth notes: only one beam level
  if (parsedCurrent.base === "eighth") {
    const leftBeams = connectsLeftFirstBeam
      ? createBeamSegments("left", [0], noteColor)
      : null;
    const rightBeams =
      connectsRightFirstBeam || !connectsLeftFirstBeam
        ? createBeamSegments("right", [0], noteColor)
        : null;

    return (
      <div className="baseFlex relative size-full !flex-nowrap">
        {verticalStem}
        {leftBeams}
        {rightBeams}
        {renderDots(parsedCurrent.dotCount, noteColor, "default")}
      </div>
    );
  }

  // For sixteenth notes: two beam levels with intelligent second beam rendering
  if (parsedCurrent.base === "sixteenth") {
    // First beam: standard beaming to any eighth/sixteenth neighbor
    const showLeftFirstBeam = connectsLeftFirstBeam;
    const showRightFirstBeam = connectsRightFirstBeam || !connectsLeftFirstBeam;

    // Second beam (sixteenth-specific): only connects to other sixteenths
    // If no adjacent sixteenth, show as a flag on one side only
    let showLeftSecondBeam = false;
    let showRightSecondBeam = false;

    if (prevIsSixteenth && nextIsSixteenth) {
      // Connected to sixteenths on both sides
      showLeftSecondBeam = true;
      showRightSecondBeam = true;
    } else if (prevIsSixteenth && !nextIsSixteenth) {
      // Only left neighbor is sixteenth - extend left beam only
      showLeftSecondBeam = true;
      showRightSecondBeam = false;
    } else if (!prevIsSixteenth && nextIsSixteenth) {
      // Only right neighbor is sixteenth - extend right beam only
      showLeftSecondBeam = false;
      showRightSecondBeam = true;
    } else {
      // No adjacent sixteenths - show flag
      // Prefer right flag, unless at end of group (then left flag)
      if (isLastInGroup || !hasNextNote) {
        showLeftSecondBeam = true;
        showRightSecondBeam = false;
      } else {
        showLeftSecondBeam = false;
        showRightSecondBeam = true;
      }
    }

    // Build the beam segments
    const leftOffsets: number[] = [];
    if (showLeftFirstBeam) leftOffsets.push(0);
    if (showLeftSecondBeam) leftOffsets.push(5);

    const rightOffsets: number[] = [];
    if (showRightFirstBeam) rightOffsets.push(0);
    if (showRightSecondBeam) rightOffsets.push(5);

    const leftBeams =
      leftOffsets.length > 0
        ? createBeamSegments("left", leftOffsets, noteColor)
        : null;
    const rightBeams =
      rightOffsets.length > 0
        ? createBeamSegments("right", rightOffsets, noteColor)
        : null;

    return (
      <div className="baseFlex relative size-full !flex-nowrap">
        {verticalStem}
        {leftBeams}
        {rightBeams}
        {renderDots(parsedCurrent.dotCount, noteColor, "default")}
      </div>
    );
  }

  // Quarter and half notes: just the stem (and dots)
  return (
    <div className="baseFlex relative size-full !flex-nowrap">
      {verticalStem}
      {renderDots(
        parsedCurrent.dotCount,
        noteColor,
        isHalfNote ? "centered" : "default",
      )}
    </div>
  );
}

export default renderStrummingGuide;
