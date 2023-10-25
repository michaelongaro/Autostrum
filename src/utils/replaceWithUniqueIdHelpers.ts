import { v4 as uuid } from "uuid"; // Assuming you're using the 'uuid' library
import {
  type ChordSequence,
  type ChordSection,
  type TabSection,
  type Section,
} from "~/stores/TabStore";

function replaceIdInChordSequence(seq: ChordSequence): ChordSequence {
  return { ...seq, id: uuid() };
}

function replaceIdInChordSection(section: ChordSection): ChordSection {
  return {
    ...section,
    id: uuid(),
    data: section.data.map(replaceIdInChordSequence),
  };
}

function replaceIdInTabData(data: string[][]): string[][] {
  return data.map((item) => {
    if (item.length > 9) {
      // Check if index 9 exists
      return [
        ...item.slice(0, 9), // Take elements from index 0 to 8
        uuid(), // Replace 9th index with unique ID
      ];
    }
    return item;
  });
}

function replaceIdInTabSection(section: TabSection): TabSection {
  return {
    ...section,
    id: uuid(),
    data: replaceIdInTabData(section.data),
  };
}

function replaceIdInSection(section: Section): (TabSection | ChordSection)[] {
  return section.data.map((item) => {
    if (item.type === "chord") {
      return replaceIdInChordSection(item);
    } else if (item.type === "tab") {
      return replaceIdInTabSection(item);
    }
    return item; // This should never be reached, but it's here for safety
  });
}

export {
  replaceIdInChordSequence,
  replaceIdInChordSection,
  replaceIdInTabSection,
  replaceIdInSection,
};
