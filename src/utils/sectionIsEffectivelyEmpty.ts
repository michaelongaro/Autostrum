import type { ChordSection, Section } from "~/stores/TabStore";

// if the whole section is empty (no tab/chord subsections), or the
// section is filled with *only* chord subsections that are empty (no strumming
// pattern is defined currently)
export default function sectionIsEffectivelyEmpty(
  section: Section,
  subSectionIndex?: number,
) {
  if (section.data.length === 0) return true;

  const consistsSolelyOfChordSections = section.data.every(
    (subSection) => subSection.type === "chord",
  );

  // Check if the current subsection is a chord section and if it's empty
  if (subSectionIndex !== undefined) {
    const currentSubSection = section.data[subSectionIndex];
    if (currentSubSection && currentSubSection.type === "chord") {
      const chordSection = currentSubSection;
      if (chordSection.data.every((chordSeq) => !chordSeq.data.length))
        return true;
    }
  }

  // Check if the section consists solely of empty chord subsections
  if (consistsSolelyOfChordSections) {
    return section.data.every((subSection) => {
      const chordSection = subSection as ChordSection;
      return chordSection.data.every((chordSeq) => !chordSeq.data.length);
    });
  }

  return false;
}
