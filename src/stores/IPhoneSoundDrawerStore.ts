import { create } from "zustand";

interface IPhoneSoundDrawerState {
  open: boolean;
  returnFocusTo: HTMLElement | null;
  openDrawer: (returnFocusTo: HTMLElement | null) => void;
  closeDrawer: () => void;
}

// Help opens only through the iPhone playback settings action, independently of
// audio readiness. Its controller keeps the closed root mounted for animations.
export const useIPhoneSoundDrawerStore = create<IPhoneSoundDrawerState>(
  (set) => ({
    open: false,
    returnFocusTo: null,
    openDrawer: (returnFocusTo) => set({ open: true, returnFocusTo }),
    closeDrawer: () => set({ open: false, returnFocusTo: null }),
  }),
);
