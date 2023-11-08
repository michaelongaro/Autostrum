interface ScrollChordIntoView {
  location: {
    sectionIndex: number;
    subSectionIndex: number;
    chordSequenceIndex?: number;
    chordIndex: number;
  };
}

export default function scrollChordIntoView({ location }: ScrollChordIntoView) {
  let currentElement = null;

  const { sectionIndex, subSectionIndex, chordSequenceIndex, chordIndex } =
    location;

  if (chordSequenceIndex !== undefined) {
    currentElement = document.getElementById(
      `section${sectionIndex}-subSection${subSectionIndex}-chordSequence${chordSequenceIndex}-chord${chordIndex}`
    );
  } else {
    currentElement = document.getElementById(
      `section${sectionIndex}-subSection${subSectionIndex}-chord${chordIndex}`
    );
  }

  if (currentElement) {
    currentElement.scrollIntoView({
      behavior: "instant",
      block: "center",
      inline: "center",
    });
  }
}
