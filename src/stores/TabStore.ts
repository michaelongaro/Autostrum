import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Tab } from "@prisma/client";
import type { ITabSection } from "~/components/Tab/Tab";

export interface SectionProgression {
  id: string;
  title: string;
  repetitions: number;
  index: number;
}

interface TabState {
  // not sure if this will hurt us later on, but I would like to avoid making all of these optional
  // and instead just set them to default-ish values

  // this is used to compare the current tabData to the original tabData to see if there are any
  // changes, and if so, enable the "save" button
  originalTabData: Tab | null;
  setOriginalTabData: (originalTabData: Tab | null) => void;

  // used in <Tab />
  id: number;
  setId: (id: number) => void;
  createdById: number; // or maybe number need to figure out how clerk stores their stuff
  setCreatedById: (createdById: number) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string | null;
  setDescription: (description: string | null) => void;
  genreId: number;
  setGenreId: (genre: number) => void;
  tuning: string;
  setTuning: (tuning: string) => void;
  bpm: number | null;
  setBpm: (bpm: number | null) => void;
  timeSignature: string | null;
  setTimeSignature: (timeSignature: string | null) => void;
  capo: number | null;
  setCapo: (capo: number | null) => void;
  tabData: ITabSection[];
  setTabData: (tabData: ITabSection[]) => void;
  editing: boolean;
  setEditing: (editing: boolean) => void;
  sectionProgression: SectionProgression[];
  setSectionProgression: (sectionProgresstion: SectionProgression[]) => void;
  showingEffectGlossary: boolean;
  setShowingEffectGlossary: (showingEffectGlossary: boolean) => void;

  // used in <TabSection />
  modifyPalmMuteDashes: (
    tab: ITabSection[],
    setTabData: (tabData: ITabSection[]) => void,
    sectionIndex: number,
    startColumnIndex: number,
    prevValue: string,
    pairNodeValue?: string
  ) => void;

  // modals
  showSectionProgressionModal: boolean;
  setShowSectionProgressionModal: (
    showSectionProgressionModal: boolean
  ) => void;
  showEffectGlossaryModal: boolean;
  setShowEffectGlossaryModal: (showEffectGlossaryModal: boolean) => void;
}

// if you ever come across a situation where you need the current value of tabData
// and can't for w/e reason use it in the component itself, you can try this convention below:
// although it will prob need to be much more generic given you are updating nested objects (immer?)
//        increase: (by) => set((state) => ({ bears: state.bears + by })),

export const useTabStore = create<TabState>()(
  devtools((set) => ({
    // used in <Tab />
    originalTabData: null,
    setOriginalTabData: (originalTabData) => set({ originalTabData }),
    id: -1,
    setId: (id) => set({ id }),
    createdById: 0,
    setCreatedById: (createdById) => set({ createdById }),
    title: "",
    setTitle: (title) => set({ title }),
    description: "",
    setDescription: (description) => set({ description }),
    genreId: -1,
    setGenreId: (genreId) => set({ genreId }),
    tuning: "",
    setTuning: (tuning) => set({ tuning }),
    bpm: null,
    setBpm: (bpm) => set({ bpm }),
    timeSignature: null,
    setTimeSignature: (timeSignature) => set({ timeSignature }),
    capo: null,
    setCapo: (capo) => set({ capo }),
    tabData: [
      {
        title: "Intro",
        data: [
          ["", "", "", "", "", "", "2", "", "note"],
          ["", "", "", "", "", "", "", "", "inlineEffect"],
          ["", "", "", "", "", "", "2", "", "note"],
          ["", "", "", "", "", "", "", "", "inlineEffect"],
          ["", "", "", "", "", "", "2", "", "note"],
          ["", "", "", "", "", "", "", "", "inlineEffect"],
          ["", "", "", "1", "", "", "", "", "note"],
          ["", "", "", "", "", "", "", "", "inlineEffect"],
        ],
      },
    ], // temporary, should just be an empty array
    setTabData: (tabData) => set({ tabData }),
    editing: true, // temporary, should be false
    setEditing: (editing) => set({ editing }),
    sectionProgression: [],
    setSectionProgression: (sectionProgression) => set({ sectionProgression }),
    showingEffectGlossary: false,
    setShowingEffectGlossary: (showingEffectGlossary) =>
      set({ showingEffectGlossary }),

    // used in <TabSection />

    modifyPalmMuteDashes: (
      tab,
      setTabData,
      sectionIndex,
      startColumnIndex,
      prevValue,
      pairNodeValue
    ) => {
      // technically could just use tabData/setter from the store right?
      let finishedModification = false;
      const newTabData = [...tab];
      let currentColumnIndex = startColumnIndex;

      // TODO: handle subsequent clicking on "remove" of both nodes as first rudimentary way to remove the
      // whole palm mute section

      while (!finishedModification) {
        // start/end node already defined, meaning we just clicked on an empty node to be the other pair node
        if (pairNodeValue !== undefined) {
          if (currentColumnIndex === startColumnIndex) {
            newTabData[sectionIndex]!.data[startColumnIndex]![0] =
              pairNodeValue === "" ? "end" : pairNodeValue;

            pairNodeValue === "start"
              ? currentColumnIndex++
              : currentColumnIndex--;
          } else if (
            newTabData[sectionIndex]!.data[currentColumnIndex]![0] ===
            (pairNodeValue === "" || pairNodeValue === "end" ? "start" : "end")
          ) {
            finishedModification = true;
          } else {
            newTabData[sectionIndex]!.data[currentColumnIndex]![0] = "-";
            pairNodeValue === "start"
              ? currentColumnIndex++
              : currentColumnIndex--;
          }
        }
        // pair already defined, meaning we just removed either the start/end node and need to remove dashes
        // in between until we hit the other node
        else {
          if (
            newTabData[sectionIndex]!.data[currentColumnIndex]?.[0] ===
            (prevValue === "start" ? "end" : "start")
          ) {
            finishedModification = true;
          } else {
            newTabData[sectionIndex]!.data[currentColumnIndex]![0] = "";
            prevValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
          }
        }
      }

      setTabData(newTabData);
    },

    // modals
    showSectionProgressionModal: false,
    setShowSectionProgressionModal: (showSectionProgressionModal) =>
      set({ showSectionProgressionModal }),
    showEffectGlossaryModal: false,
    setShowEffectGlossaryModal: (showEffectGlossaryModal) =>
      set({ showEffectGlossaryModal }),
  }))
);
