import { scroller } from "react-scroll";

const STICKY_HEADER_HEIGHT_PX = 64;
const MOBILE_TOP_SCROLL_PADDING_PX = 20;
const DESKTOP_TOP_SCROLL_PADDING_PX = 28;
const MOBILE_BOTTOM_VIEWPORT_PADDING_PX = 24;
const DESKTOP_BOTTOM_VIEWPORT_PADDING_PX = 32;

interface ScrollChordIntoView {
  location: {
    sectionIndex: number;
    subSectionIndex: number;
    chordSequenceIndex?: number;
    chordIndex: number;
  };
  duration?: number;
  align?: "comfortable" | "belowHeader";
}

export function getChordElement({
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
  chordIndex,
}: ScrollChordIntoView["location"]): HTMLElement | null {
  if (chordSequenceIndex !== undefined) {
    return document.getElementById(
      `section${sectionIndex}-subSection${subSectionIndex}-chordSequence${chordSequenceIndex}-chord${chordIndex}`,
    );
  }

  return document.getElementById(
    `section${sectionIndex}-subSection${subSectionIndex}-chord${chordIndex}`,
  );
}

export function getChordViewportMargins(): {
  topMargin: number;
  bottomMargin: number;
} {
  const isAboveLargeViewport = window.innerWidth >= 1024;
  const topMargin =
    STICKY_HEADER_HEIGHT_PX +
    (isAboveLargeViewport
      ? DESKTOP_TOP_SCROLL_PADDING_PX
      : MOBILE_TOP_SCROLL_PADDING_PX);
  const bottomMargin = isAboveLargeViewport
    ? DESKTOP_BOTTOM_VIEWPORT_PADDING_PX
    : MOBILE_BOTTOM_VIEWPORT_PADDING_PX;

  return { topMargin, bottomMargin };
}

function getComfortableChordOffset(rect: DOMRect): number {
  const { topMargin } = getChordViewportMargins();
  const preferredTopOffset = Math.round(
    window.innerHeight * 0.24 - rect.height / 2,
  );

  return Math.max(topMargin, preferredTopOffset);
}

export default function scrollChordIntoView({
  location,
  duration = 500,
  align = "comfortable",
}: ScrollChordIntoView) {
  const currentElement = getChordElement(location);

  if (currentElement) {
    const rect = currentElement.getBoundingClientRect();
    const { topMargin } = getChordViewportMargins();
    const offset =
      align === "belowHeader" ? topMargin : getComfortableChordOffset(rect);

    scroller.scrollTo(currentElement.id, {
      duration,
      delay: 0,
      smooth: "easeInOutQuad",
      offset: -offset,
    });
  }
}
