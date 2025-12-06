import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { IoSunnyOutline, IoMoonOutline } from "react-icons/io5";
import { HiMiniComputerDesktop } from "react-icons/hi2";
import {
  NEAR_WHITE_COLOR_VALUES,
  updateCSSThemeVars,
} from "~/utils/updateCSSThemeVars";
import { api } from "~/utils/api";
import { useTabStore } from "~/stores/TabStore";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const COLORS = [
  "peony",
  "coral",
  "saffron",
  "maple",
  "pistachio",
  "verdant",
  "aqua",
  "sapphire",
  "amethyst",
] as const;

const COLOR_HEX_VALUES: Record<(typeof COLORS)[number], string> = {
  peony: "#E93D82",
  coral: "#E5484D",
  saffron: "#E54D2E",
  maple: "#A18072",
  pistachio: "#46A758",
  verdant: "#12A594",
  aqua: "#00A2C7",
  sapphire: "#3E63DD",
  amethyst: "#8E4EC6",
};

interface ThemePicker {
  allowUpdateOfDBColor?: boolean;
}

function ThemePicker({ allowUpdateOfDBColor = true }: ThemePicker) {
  const { userId } = useAuth();

  const {
    color,
    setColor,
    theme,
    setTheme,
    followsDeviceTheme,
    setFollowsDeviceTheme,
  } = useTabStore((state) => ({
    color: state.color,
    setColor: state.setColor,
    theme: state.theme,
    setTheme: state.setTheme,
    followsDeviceTheme: state.followsDeviceTheme,
    setFollowsDeviceTheme: state.setFollowsDeviceTheme,
  }));

  const { mutate: updateDBColor } = api.user.updateColor.useMutation({
    // FYI: I don't believe an onSuccess is necessary here
    onError: (e) => {
      console.error(e);
    },
  });

  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);

  return (
    <div className="baseVertFlex mt-4 w-full !items-start tablet:mt-0">
      <span className="font-medium sm:text-lg">Color</span>
      <Separator className="h-[1px] bg-foreground/50" />

      <div className="mt-4 grid w-full grid-cols-3 grid-rows-3 gap-2">
        {COLORS.map((colorString) => (
          <div key={colorString} className="baseVertFlex w-full gap-1">
            <Button
              variant={"theme"}
              onMouseEnter={() => setHoveredColor(colorString)}
              onMouseLeave={() => setHoveredColor(null)}
              onTouchStart={() => setHoveredColor(colorString)}
              onTouchEnd={() => setHoveredColor(null)}
              onTouchCancel={() => setHoveredColor(null)}
              onClick={() => {
                updateCSSThemeVars(colorString, theme);
                setColor(colorString);
                window.localStorage.setItem("autostrum-color", colorString);

                if (userId && allowUpdateOfDBColor) {
                  updateDBColor(colorString);
                }
              }}
              style={{
                backgroundColor: COLOR_HEX_VALUES[colorString],
                borderColor: COLOR_HEX_VALUES[colorString],
              }}
              className={`relative !size-12 !rounded-full border !p-0`}
            >
              <AnimatePresence>
                {(color === colorString || hoveredColor === colorString) && (
                  <motion.div
                    key={`hovered-color-${colorString}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      borderColor: NEAR_WHITE_COLOR_VALUES[colorString],
                    }}
                    className="absolute inset-0 rounded-full border-2"
                  ></motion.div>
                )}
              </AnimatePresence>
            </Button>
            <span
              className={`text-sm font-medium transition-all ${color === colorString ? "opacity-100" : "opacity-50"}`}
            >
              {colorString.charAt(0).toUpperCase() + colorString.slice(1)}
            </span>
          </div>
        ))}
      </div>

      <span className="mt-2 font-medium sm:mt-4 sm:text-lg">Theme</span>
      <Separator className="h-[1px] bg-foreground/50" />

      <div className="mt-4 grid w-full grid-cols-3 grid-rows-1 gap-2">
        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"theme"}
            onMouseEnter={() => setHoveredTheme("light")}
            onMouseLeave={() => setHoveredTheme(null)}
            onTouchStart={() => setHoveredTheme("light")}
            onTouchEnd={() => setHoveredTheme(null)}
            onTouchCancel={() => setHoveredTheme(null)}
            onClick={() => {
              updateCSSThemeVars(color, "light");
              setTheme("light");
              setFollowsDeviceTheme(false);
              window.localStorage.setItem("autostrum-theme", "light");
              window.localStorage.setItem(
                "autostrum-follows-device-theme",
                "false",
              );
            }}
            className="relative !size-12 !rounded-full !p-0"
          >
            <IoSunnyOutline className="size-6 text-foreground" />
            <AnimatePresence>
              {((theme === "light" && !followsDeviceTheme) ||
                hoveredTheme === "light") && (
                <motion.div
                  key={"hovered-theme-light"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 rounded-full border-2 border-foreground"
                ></motion.div>
              )}
            </AnimatePresence>
          </Button>
          <span
            className={`text-sm font-medium ${!followsDeviceTheme && theme === "light" ? "" : "opacity-50"}`}
          >
            Light
          </span>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"theme"}
            onMouseEnter={() => setHoveredTheme("dark")}
            onMouseLeave={() => setHoveredTheme(null)}
            onTouchStart={() => setHoveredTheme("dark")}
            onTouchEnd={() => setHoveredTheme(null)}
            onTouchCancel={() => setHoveredTheme(null)}
            onClick={() => {
              updateCSSThemeVars(color, "dark");
              setTheme("dark");
              setFollowsDeviceTheme(false);
              window.localStorage.setItem("autostrum-theme", "dark");
              window.localStorage.setItem(
                "autostrum-follows-device-theme",
                "false",
              );
            }}
            className="relative !size-12 !rounded-full !p-0"
          >
            <IoMoonOutline className="size-6 text-foreground" />
            <AnimatePresence>
              {((theme === "dark" && !followsDeviceTheme) ||
                hoveredTheme === "dark") && (
                <motion.div
                  key={"hovered-theme-dark"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 rounded-full border-2 border-foreground"
                ></motion.div>
              )}
            </AnimatePresence>
          </Button>
          <span
            className={`text-sm font-medium ${!followsDeviceTheme && theme === "dark" ? "" : "opacity-50"}`}
          >
            Dark
          </span>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"theme"}
            onMouseEnter={() => setHoveredTheme("system")}
            onMouseLeave={() => setHoveredTheme(null)}
            onTouchStart={() => setHoveredTheme("system")}
            onTouchEnd={() => setHoveredTheme(null)}
            onTouchCancel={() => setHoveredTheme(null)}
            onClick={() => {
              const systemTheme = window.matchMedia(
                "(prefers-color-scheme: dark)",
              ).matches
                ? "dark"
                : "light";
              updateCSSThemeVars(color, systemTheme);
              setTheme(systemTheme);
              setFollowsDeviceTheme(true);
              window.localStorage.setItem("autostrum-theme", systemTheme);
              window.localStorage.setItem(
                "autostrum-follows-device-theme",
                "true",
              );
            }}
            className="relative !size-12 !rounded-full !p-0"
          >
            <HiMiniComputerDesktop className="size-6 text-foreground" />
            <AnimatePresence>
              {(hoveredTheme === "system" || followsDeviceTheme) && (
                <motion.div
                  key={"hovered-theme-system"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 rounded-full border-2 border-foreground"
                ></motion.div>
              )}
            </AnimatePresence>
          </Button>
          <span
            className={`text-sm font-medium ${followsDeviceTheme ? "" : "opacity-50"}`}
          >
            System
          </span>
        </div>
      </div>
    </div>
  );
}

export default ThemePicker;
