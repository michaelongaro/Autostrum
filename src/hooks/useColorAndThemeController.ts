import { useAuth } from "@clerk/nextjs";
import { useEffect, useLayoutEffect, useState } from "react";
import { useTabStore, type COLORS, type THEME } from "~/stores/TabStore";
import { api } from "~/utils/api";
import { updateCSSThemeVars } from "~/utils/updateCSSThemeVars";

// Helper functions for localStorage operations
const STORAGE_KEYS = {
  COLOR: "autostrum-color",
  THEME: "autostrum-theme",
  FOLLOWS_DEVICE_THEME: "autostrum-follows-device-theme",
} as const;

const getStorageValue = (key: string): string | null => {
  return window.localStorage.getItem(key);
};

const setStorageValue = (key: string, value: string): void => {
  window.localStorage.setItem(key, value);
};

const getSystemTheme = (): THEME => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

function useColorAndThemeController() {
  const { userId } = useAuth();

  const {
    color,
    setColor,
    setTheme,
    followsDeviceTheme,
    setFollowsDeviceTheme,
  } = useTabStore((state) => ({
    color: state.color,
    setColor: state.setColor,
    setTheme: state.setTheme,
    followsDeviceTheme: state.followsDeviceTheme,
    setFollowsDeviceTheme: state.setFollowsDeviceTheme,
  }));

  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  const [initializedUserDBColor, setInitializedUserDBColor] = useState(false);

  function initializeFromStorage() {
    const storedColor = getStorageValue(STORAGE_KEYS.COLOR);
    const storedTheme = getStorageValue(STORAGE_KEYS.THEME);
    const storedFollowsDevice = getStorageValue(
      STORAGE_KEYS.FOLLOWS_DEVICE_THEME,
    );

    return {
      color: storedColor,
      theme: storedTheme,
      followsDeviceTheme: storedFollowsDevice,
    };
  }

  function setDefaultPreferences() {
    const systemTheme = getSystemTheme();
    const defaultColor = "peony";

    // Update CSS vars and store state
    updateCSSThemeVars(defaultColor, systemTheme);
    setColor(defaultColor);
    setTheme(systemTheme);
    setFollowsDeviceTheme(true);

    // Save to localStorage
    setStorageValue(STORAGE_KEYS.COLOR, defaultColor);
    setStorageValue(STORAGE_KEYS.THEME, systemTheme);
    setStorageValue(STORAGE_KEYS.FOLLOWS_DEVICE_THEME, "true");
  }

  function applyStoredPreferences(
    storedColor: string,
    storedTheme: string,
    followsDevice: boolean,
  ) {
    const systemTheme = getSystemTheme();
    const effectiveTheme = followsDevice ? systemTheme : (storedTheme as THEME);

    // Update CSS and store state
    updateCSSThemeVars(storedColor as COLORS, effectiveTheme);
    setColor(storedColor as COLORS);
    setTheme(effectiveTheme);
    setFollowsDeviceTheme(followsDevice);
  }

  // Initialize color and theme from localStorage or set defaults
  useLayoutEffect(() => {
    const stored = initializeFromStorage();

    const hasAllStoredValues =
      stored.color && stored.theme && stored.followsDeviceTheme !== null;

    if (hasAllStoredValues) {
      applyStoredPreferences(
        stored.color!,
        stored.theme!,
        stored.followsDeviceTheme === "true",
      );
    } else {
      setDefaultPreferences();
    }
  }, []);

  // Sync color with database user preferences
  useEffect(() => {
    if (!currentUser || initializedUserDBColor) return;

    const currentTheme = useTabStore.getState().theme;
    const userColor = currentUser.color as COLORS;

    updateCSSThemeVars(userColor, currentTheme);

    setColor(userColor);
    setStorageValue(STORAGE_KEYS.COLOR, userColor);
    setInitializedUserDBColor(true);
  }, [currentUser, initializedUserDBColor]);

  // Listen for system theme changes when following device theme
  useEffect(() => {
    if (!followsDeviceTheme) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleThemeChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "light";
      updateCSSThemeVars(color, newTheme);
      setTheme(newTheme);
    };

    mediaQuery.addEventListener("change", handleThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, [followsDeviceTheme, color]);
}

export default useColorAndThemeController;
