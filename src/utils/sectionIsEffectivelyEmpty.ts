import type { ChordSection, Section } from "~/stores/TabStore";

// if the whole section is empty (no tab/chord subsections), or the
// section is filled with *only* chord subsections that are empty (no strumming
// pattern is defined currently)
export default function sectionIsEffectivelyEmpty(
  tabData: Section[],
  sectionIndex: number,
  subSectionIndex?: number
) {
  const sectionData = tabData[sectionIndex]?.data;
  if (!sectionData || sectionData.length === 0) return true;

  const consistsSolelyOfChordSections = sectionData.every(
    (subSection) => subSection.type === "chord"
  );

  // Check if the current subsection is a chord section and if it's empty
  if (subSectionIndex !== undefined) {
    const currentSubSection = sectionData[subSectionIndex];
    if (currentSubSection && currentSubSection.type === "chord") {
      const chordSection = currentSubSection;
      if (chordSection.data.every((chordSeq) => !chordSeq.data.length))
        return true;
    }
  }

  // Check if the section consists solely of empty chord subsections
  if (consistsSolelyOfChordSections) {
    return sectionData.every((subSection) => {
      const chordSection = subSection as ChordSection;
      return chordSection.data.every((chordSeq) => !chordSeq.data.length);
    });
  }

  return false;
}
