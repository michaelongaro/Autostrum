import { create } from "zustand";
import type { ITabSection } from "~/components/Tab/Tab";

interface TabState {
  // used in <Tab />
  createdById: number; // or maybe number need to figure out how clerk stores their stuff
  setCreatedById: (createdById: number) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  genre: string; // should be stringID? or just fetch the actual name and color from db based on id when needed?
  setGenre: (genre: string) => void;
  tuning: string;
  setTuning: (tuning: string) => void;
  BPM: number;
  setBPM: (BPM: number) => void;
  timeSignature: string;
  setTimeSignature: (timeSignature: string) => void;
  tabData: ITabSection[];
  setTabData: (tabData: ITabSection[]) => void;
  editing: boolean;
  setEditing: (editing: boolean) => void;

  // used in <TabSection />
  addingNewPalmMuteSection: boolean;
  setAddingNewPalmMuteSection: (addingNewPalmMuteSection: boolean) => void;
  newPalmMuteLocation: [number, number];
  setNewPalmMuteLocation: (newPalmMuteLocation: [number, number]) => void;
}

// if you ever come across a situation where you need the current value of tabData
// and can't for w/e reason use it in the component itself, you can try this convention below:
// although it will prob need to be much more generic given you are updating nested objects (immer?)
//        increase: (by) => set((state) => ({ bears: state.bears + by })),

export const useTabStore = create<TabState>()((set) => ({
  // used in <Tab />
  createdById: 0,
  setCreatedById: (createdById) => set({ createdById }),
  title: "",
  setTitle: (title) => set({ title }),
  description: "",
  setDescription: (description) => set({ description }),
  genre: "",
  setGenre: (genre) => set({ genre }),
  tuning: "EADGBE",
  setTuning: (tuning) => set({ tuning }),
  BPM: 75,
  setBPM: (BPM) => set({ BPM }),
  timeSignature: "4/4",
  setTimeSignature: (timeSignature) => set({ timeSignature }),
  tabData: [
    {
      title: "Intro",
      data: [
        ["", "", "", "", "", "", "2", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "2", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "2", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "1", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
      ],
    },
  ], // temporary, should just be an empty array
  setTabData: (tabData) => set({ tabData }),
  editing: true,
  setEditing: (editing) => set({ editing }),

  // used in <TabSection />
  addingNewPalmMuteSection: false,
  setAddingNewPalmMuteSection: (addingNewPalmMuteSection) =>
    set({ addingNewPalmMuteSection }),
  newPalmMuteLocation: [-1, -1],
  setNewPalmMuteLocation: (newPalmMuteLocation) => set({ newPalmMuteLocation }),
}));