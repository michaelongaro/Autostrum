import { create } from "zustand";

interface IPhoneSoundDrawerState {
  open: boolean;
  hasOpened: boolean;
  returnFocusTo: HTMLElement | null;
  openDrawer: (returnFocusTo: HTMLElement | null) => void;
  closeDrawer: () => void;
}

// Help opens only through the iPhone playback settings action, independently of
// audio readiness. Keep it mounted after first use for the drawer's exit animation.
export const useIPhoneSoundDrawerStore = create<IPhoneSoundDrawerState>(
  (set) => ({
    open: false,
    hasOpened: false,
    returnFocusTo: null,
    openDrawer: (returnFocusTo) =>
      set({ open: true, hasOpened: true, returnFocusTo }),
    closeDrawer: () => set({ open: false, returnFocusTo: null }),
  }),
);
