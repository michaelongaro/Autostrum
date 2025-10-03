import {
  useTabStore,
  type Section,
  type TabSection,
  type ChordSection,
  type ChordSequence,
} from "~/stores/TabStore";

export const useSectionData = (sectionIndex: number) => {
  return useTabStore((state) => state.tabData[sectionIndex] as Section);
};

export const useSubSectionData = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const section = state.tabData[sectionIndex];

    // @ts-expect-error TODO come back later
    return section.data[subSectionIndex] as TabSection | ChordSection;
  });
};

export const useTabSubSectionData = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const section = state.tabData[sectionIndex];

    // @ts-expect-error TODO come back later
    return section.data[subSectionIndex] as TabSection;
  });
};

export const useChordSubSectionData = (
  sectionIndex: number,
  subSectionIndex: number,
) => {
  return useTabStore((state) => {
    const section = state.tabData[sectionIndex];

    // @ts-expect-error TODO come back later
    return section.data[subSectionIndex] as ChordSection;
  });
};

export const useChordSequenceData = (
  sectionIndex: number,
  subSectionIndex: number,
  chordSequenceIndex: number,
) => {
  return useTabStore((state) => {
    const section = state.tabData[sectionIndex];

    // @ts-expect-error TODO come back later
    return section.data[subSectionIndex].data[
      chordSequenceIndex
    ] as ChordSequence;
  });
};

export const useColumnData = (
  sectionIndex: number,
  subSectionIndex: number,
  columnIndex: number,
) => {
  return useTabStore((state) => {
    const subSection = state.tabData[sectionIndex]?.data[subSectionIndex];

    // @ts-expect-error TODO come back later
    return subSection.data[columnIndex] as string[];
  });
};

// TODO: maybe don't need this
export const useTabDataSubSectionLength = (sectionIndex: number) => {
  // @ts-expect-error TODO come back later
  return useTabStore((state) => state.tabData[sectionIndex].data.length);
};

export const useTabDataLength = () => {
  return useTabStore((state) => state.tabData.length);
};
