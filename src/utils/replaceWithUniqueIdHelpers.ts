import {
  type ChordSequence,
  type ChordSection,
  type TabSection,
  type Section,
} from "~/stores/TabStore";

function replaceIdInChordSequence(seq: ChordSequence): ChordSequence {
  return { ...seq, id: crypto.randomUUID() };
}

function replaceIdInChordSection(section: ChordSection): ChordSection {
  return {
    ...section,
    id: crypto.randomUUID(),
    data: section.data.map(replaceIdInChordSequence),
  };
}

function replaceIdInTabData(data: string[][]): string[][] {
  return data.map((item) => {
    if (item.length > 9) {
      // Check if index 9 exists
      return [
        ...item.slice(0, 9), // Take elements from index 0 to 8
        crypto.randomUUID(), // Replace 9th index with unique ID
      ];
    }
    return item;
  });
}

function replaceIdInTabSection(section: TabSection): TabSection {
  return {
    ...section,
    id: crypto.randomUUID(),
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
