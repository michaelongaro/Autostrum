import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
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
    theme,
    setColor,
    setTheme,
    followsDeviceTheme,
    setFollowsDeviceTheme,
  } = useTabStore((state) => ({
    color: state.color,
    theme: state.theme,
    setColor: state.setColor,
    setTheme: state.setTheme,
    followsDeviceTheme: state.followsDeviceTheme,
    setFollowsDeviceTheme: state.setFollowsDeviceTheme,
  }));

  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  const initializedUserDBColorRef = useRef(false);

  const setDefaultPreferences = useCallback(() => {
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
  }, [setColor, setFollowsDeviceTheme, setTheme]);

  const applyStoredPreferences = useCallback(
    (
    storedColor: string,
    storedTheme: string,
    followsDevice: boolean,
    ) => {
      const systemTheme = getSystemTheme();
      const effectiveTheme = followsDevice
        ? systemTheme
        : (storedTheme as THEME);

      // Update CSS and store state
      updateCSSThemeVars(storedColor as COLORS, effectiveTheme);
      setColor(storedColor as COLORS);
      setTheme(effectiveTheme);
      setFollowsDeviceTheme(followsDevice);
    },
    [setColor, setFollowsDeviceTheme, setTheme],
  );

  // Initialize color and theme from localStorage or set defaults
  useLayoutEffect(() => {
    const storedColor = getStorageValue(STORAGE_KEYS.COLOR);
    const storedTheme = getStorageValue(STORAGE_KEYS.THEME);
    const storedFollowsDeviceTheme = getStorageValue(
      STORAGE_KEYS.FOLLOWS_DEVICE_THEME,
    );

    const hasAllStoredValues =
      storedColor && storedTheme && storedFollowsDeviceTheme !== null;

    if (hasAllStoredValues) {
      applyStoredPreferences(
        storedColor,
        storedTheme,
        storedFollowsDeviceTheme === "true",
      );
      return;
    }

    setDefaultPreferences();
  }, [applyStoredPreferences, setDefaultPreferences]);

  // Sync color with database user preferences
  useEffect(() => {
    if (!currentUser || initializedUserDBColorRef.current) return;

    const userColor = currentUser.color as COLORS;
    const storedColor = getStorageValue(STORAGE_KEYS.COLOR) as COLORS | null;

    if (storedColor === userColor) {
      initializedUserDBColorRef.current = true;
      return;
    }

    setStorageValue(STORAGE_KEYS.COLOR, userColor);
    updateCSSThemeVars(userColor, theme);

    setColor(userColor);
    initializedUserDBColorRef.current = true;
  }, [currentUser, setColor, theme]);

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
  }, [followsDeviceTheme, color, setTheme]);
}

export default useColorAndThemeController;
