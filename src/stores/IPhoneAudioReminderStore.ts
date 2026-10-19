import { create } from "zustand";

export const IPHONE_SOUND_REMINDER_DISMISSED_KEY =
  "autostrum-iphone-sound-reminder-dismissed:v1";

interface IPhoneAudioReminderState {
  open: boolean;
  hasPrompted: boolean;
  /** Only request after an actual playback recovery failure. */
  requestReminder: () => boolean;
  dismissReminder: (permanently?: boolean) => void;
}

// Shared by the main player and independent homepage demo stores. Keeping this
// outside TabStore also preserves the once-per-visit reminder across navigation.
export const useIPhoneAudioReminderStore = create<IPhoneAudioReminderState>(
  (set, get) => ({
    open: false,
    hasPrompted: false,
    requestReminder: () => {
      if (
        typeof window === "undefined" ||
        !/iPhone/i.test(navigator.userAgent)
      ) {
        return false;
      }

      const { open, hasPrompted } = get();
      if (hasPrompted) return open;

      try {
        if (
          localStorage.getItem(IPHONE_SOUND_REMINDER_DISMISSED_KEY) === "true"
        ) {
          return false;
        }
      } catch {
        // The reminder still works when browser storage is unavailable.
      }

      // This is troubleshooting after a failed recovery, never mute detection.
      set({ open: true, hasPrompted: true });
      return true;
    },
    dismissReminder: (permanently = false) => {
      if (permanently) {
        try {
          localStorage.setItem(IPHONE_SOUND_REMINDER_DISMISSED_KEY, "true");
        } catch {
          // At least suppress it for this visit if persistence is blocked.
        }
      }
      set({ open: false, hasPrompted: true });
    },
  }),
);
