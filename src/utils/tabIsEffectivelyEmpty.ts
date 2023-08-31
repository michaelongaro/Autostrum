import type { Section } from "~/stores/TabStore";

export default function tabIsEffectivelyEmpty(tabData: Section[]) {
  // Criteria 1: Check if tabData is empty
  if (tabData.length === 0) return true;

  // Criteria 2: Check if all sections are empty
  const allSectionsEmpty = tabData.every(
    (section) => section.data.length === 0
  );

  if (!allSectionsEmpty) return false;

  // Criteria 3 and 4: Loop through all sections to find chord sections with non-empty strumming patterns or tab sections
  for (const section of tabData) {
    for (const subSection of section.data) {
      if (subSection.type === "chord") {
        const chordSubsection = subSection;
        if (chordSubsection.data.length !== 0) return false; // Found a chord section with non-empty strumming pattern
      } else if (subSection.type === "tab") {
        return false; // Found a tab section
      }
    }
  }

  // If all conditions are met, tabData is effectively empty
  return true;
}
