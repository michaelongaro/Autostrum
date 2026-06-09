import type { Section } from "~/stores/TabStore";

export default function tabIsEffectivelyEmpty(tabData: Section[]) {
  if (tabData.length === 0) return true;

  // check if all sections are empty
  const allSectionsEmpty = tabData.every(
    (section) => section.data.length === 0,
  );

  if (!allSectionsEmpty) return false;

  // Loop through all sections to find chord sections with non-empty strumming patterns or tab sections
  for (const section of tabData) {
    for (const subSection of section.data) {
      if (subSection.type === "chord") {
        if (subSection.data.length !== 0) return false; // Found a chord section with non-empty strumming pattern
      } else if (subSection.type === "tab") {
        return false; // Found a tab section
      }
    }
  }

  return true;
}
