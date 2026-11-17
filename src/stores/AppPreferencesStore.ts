import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { useShallow } from "zustand/shallow";
import type { COLORS, THEME } from "./tab/types";

export interface AppPreferencesState {
  viewportLabel:
    | "mobile"
    | "mobileNarrowLandscape"
    | "mobileLandscape"
    | "mobileLarge"
    | "lg"
    | "desktop";
  setViewportLabel: (
    viewportLabel:
      | "mobile"
      | "mobileNarrowLandscape"
      | "mobileLandscape"
      | "mobileLarge"
      | "lg"
      | "desktop",
  ) => void;

  // theme
  color: COLORS;
  setColor: (color: COLORS) => void;
  theme: THEME;
  setTheme: (theme: THEME) => void;
  followsDeviceTheme: boolean;
  setFollowsDeviceTheme: (followsDeviceTheme: boolean) => void;
}

export const createAppPreferencesStore = (
  initial: Partial<AppPreferencesState> = {},
) =>
  createStore<AppPreferencesState>()((set) => ({
    color: initial.color ?? "maple",
    theme: initial.theme ?? "light",
    viewportLabel: initial.viewportLabel ?? "mobile",
    followsDeviceTheme: initial.followsDeviceTheme ?? true,
    setColor: (color) =>
      set((state) => (state.color === color ? state : { color })),
    setTheme: (theme) =>
      set((state) => (state.theme === theme ? state : { theme })),
    setViewportLabel: (viewportLabel) =>
      set((state) =>
        state.viewportLabel === viewportLabel ? state : { viewportLabel },
      ),
    setFollowsDeviceTheme: (followsDeviceTheme) =>
      set((state) =>
        state.followsDeviceTheme === followsDeviceTheme
          ? state
          : { followsDeviceTheme },
      ),
  }));

export const AppPreferencesContext = createContext<ReturnType<
  typeof createAppPreferencesStore
> | null>(null);

// App-wide preferences outlive route-scoped tab documents.
export const defaultAppPreferencesStore = createAppPreferencesStore();
export const useAppPreferencesStoreApi = () =>
  useContext(AppPreferencesContext) ?? defaultAppPreferencesStore;
export const useAppPreferencesStore = <T>(
  selector: (state: AppPreferencesState) => T,
): T => useStore(useAppPreferencesStoreApi(), useShallow(selector));
