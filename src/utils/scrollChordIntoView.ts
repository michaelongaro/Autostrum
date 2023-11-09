import { scroller } from "react-scroll";

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
    const rect = currentElement.getBoundingClientRect();

    scroller.scrollTo(currentElement.id, {
      duration: 500,
      delay: 0,
      smooth: "easeInOutQuad",
      offset: -(
        window.innerHeight / 2 -
        rect.height / 2 -
        window.innerHeight * 0.25
      ),
    });
  }
}
