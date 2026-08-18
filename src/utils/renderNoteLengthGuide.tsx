import type { CSSProperties } from "react";
import type { COLORS, FullNoteLengths } from "~/stores/TabStore";
import { WholeNote, getDynamicNoteLengthIcon } from "~/utils/noteLengthIcons";

type NoteBase = "whole" | "half" | "quarter" | "eighth" | "sixteenth";
type BeamSide = "left" | "right";

interface ParsedNote {
  base: NoteBase;
  dotCount: 0 | 1 | 2;
}

const NOTE_BASES: readonly NoteBase[] = [
  "whole",
  "half",
  "quarter",
  "eighth",
  "sixteenth",
];

function parseFullNoteLength(note: FullNoteLengths): ParsedNote {
  const normalizedNote = String(note).toLowerCase();

  const base = NOTE_BASES.find((candidate) =>
    normalizedNote.includes(candidate),
  );

  if (!base) {
    throw new Error(`Unsupported note length: ${String(note)}`);
  }

  let dotCount: 0 | 1 | 2 = 0;

  if (normalizedNote.includes("double-dotted")) {
    dotCount = 2;
  } else if (normalizedNote.includes("dotted")) {
    dotCount = 1;
  }

  return {
    base,
    dotCount,
  };
}

function supportsBeaming(note: ParsedNote | null): boolean {
  return note?.base === "eighth" || note?.base === "sixteenth";
}

function getFallbackBeamSide(
  isFirstInGroup: boolean,
  isLastInGroup: boolean,
): BeamSide {
  if (isLastInGroup && !isFirstInGroup) {
    return "left";
  }

  return "right";
}

function createBeamSegments(
  position: BeamSide,
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
      ? "absolute left-[70%] top-1/2 ml-[2px] flex -translate-y-1/2 gap-[2px]"
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

interface RenderNoteLengthGuide {
  previousNoteLength?: FullNoteLengths;
  currentNoteLength?: FullNoteLengths;
  nextNoteLength?: FullNoteLengths;
  previousIsRestStrum?: boolean;
  currentIsRestStrum?: boolean;
  nextIsRestStrum?: boolean;
  color?: COLORS;
  theme?: "light" | "dark";
  /** True if this is the first strum in a chord sequence or after a measure. */
  isFirstInGroup?: boolean;
  /** True if this is the last strum in a chord sequence or before a measure. */
  isLastInGroup?: boolean;
}

function renderNoteLengthGuide({
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
}: RenderNoteLengthGuide) {
  if (!currentNoteLength) {
    return null;
  }

  const noteColor =
    color && theme ? "hsl(var(--screenshot-foreground))" : "currentColor";

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
      className={`w-[1px] rounded-md ${
        isHalfNote ? "h-1/2 self-start" : "h-full"
      }`}
      style={{ backgroundColor: noteColor }}
    ></div>
  );

  const currentSupportsBeams = supportsBeaming(parsedCurrent);

  const parsedPrevious =
    currentSupportsBeams &&
    !isFirstInGroup &&
    previousNoteLength !== undefined &&
    !previousIsRestStrum
      ? parseFullNoteLength(previousNoteLength)
      : null;

  const parsedNext =
    currentSupportsBeams &&
    !isLastInGroup &&
    nextNoteLength !== undefined &&
    !nextIsRestStrum
      ? parseFullNoteLength(nextNoteLength)
      : null;

  const previousSupportsBeams = supportsBeaming(parsedPrevious);
  const nextSupportsBeams = supportsBeaming(parsedNext);

  const previousIsSixteenth = parsedPrevious?.base === "sixteenth";
  const nextIsSixteenth = parsedNext?.base === "sixteenth";

  const fallbackBeamSide = getFallbackBeamSide(isFirstInGroup, isLastInGroup);

  /*
   * The primary beam joins any adjacent eighth or sixteenth note. If this
   * note has no beamable neighbors, a half-width segment acts as its flag.
   */
  let showLeftFirstBeam = previousSupportsBeams;
  let showRightFirstBeam = nextSupportsBeams;

  if (!showLeftFirstBeam && !showRightFirstBeam) {
    showLeftFirstBeam = fallbackBeamSide === "left";
    showRightFirstBeam = fallbackBeamSide === "right";
  }

  if (parsedCurrent.base === "eighth") {
    const leftBeams = showLeftFirstBeam
      ? createBeamSegments("left", [0], noteColor)
      : null;

    const rightBeams = showRightFirstBeam
      ? createBeamSegments("right", [0], noteColor)
      : null;

    return (
      <div className="baseFlex relative size-full !flex-nowrap">
        {leftBeams}
        {verticalStem}
        {rightBeams}
        {renderDots(parsedCurrent.dotCount, noteColor)}
      </div>
    );
  }

  if (parsedCurrent.base === "sixteenth") {
    /*
     * The secondary beam joins only adjacent sixteenth notes.
     *
     * If there is no adjacent sixteenth, it becomes a beamlet. The beamlet
     * points toward the side on which the primary beam is connected. This
     * prevents cases such as an eighth-sixteenth-quarter sequence from
     * rendering its primary beam to the left and secondary beam to the right.
     */
    let showLeftSecondBeam = previousIsSixteenth;
    let showRightSecondBeam = nextIsSixteenth;

    if (!showLeftSecondBeam && !showRightSecondBeam) {
      if (showLeftFirstBeam && !showRightFirstBeam) {
        showLeftSecondBeam = true;
      } else if (showRightFirstBeam && !showLeftFirstBeam) {
        showRightSecondBeam = true;
      } else {
        showLeftSecondBeam = fallbackBeamSide === "left";
        showRightSecondBeam = fallbackBeamSide === "right";
      }
    }

    const leftOffsets: number[] = [];

    if (showLeftFirstBeam) {
      leftOffsets.push(0);
    }

    if (showLeftSecondBeam) {
      leftOffsets.push(5);
    }

    const rightOffsets: number[] = [];

    if (showRightFirstBeam) {
      rightOffsets.push(0);
    }

    if (showRightSecondBeam) {
      rightOffsets.push(5);
    }

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
        {leftBeams}
        {verticalStem}
        {rightBeams}
        {renderDots(parsedCurrent.dotCount, noteColor)}
      </div>
    );
  }

  return (
    <div className="baseFlex relative size-full !flex-nowrap">
      {verticalStem}
      {renderDots(parsedCurrent.dotCount, noteColor)}
    </div>
  );
}

export default renderNoteLengthGuide;
