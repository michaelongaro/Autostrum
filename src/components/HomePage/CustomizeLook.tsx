import Image, { type StaticImageData } from "next/image";
import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { HiMiniComputerDesktop } from "react-icons/hi2";
import { IoMoonOutline, IoSunnyOutline } from "react-icons/io5";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore, type COLORS } from "~/stores/TabStore";
import { api } from "~/utils/api";
import {
  COLOR_HEX_VALUES,
  NEAR_WHITE_COLOR_VALUES,
  updateCSSThemeVars,
} from "~/utils/updateCSSThemeVars";

import amethystImage from "public/homepage/guitars/amethyst.jpg";
import aquaImage from "public/homepage/guitars/aqua.jpg";
import coralImage from "public/homepage/guitars/coral.jpg";
import mapleImage from "public/homepage/guitars/maple.jpg";
import peonyImage from "public/homepage/guitars/peony.jpg";
import pistachioImage from "public/homepage/guitars/pistachio.jpg";
import saffronImage from "public/homepage/guitars/saffron.jpg";
import sapphireImage from "public/homepage/guitars/sapphire.jpg";
import verdantImage from "public/homepage/guitars/verdant.jpg";

const COLORS_LIST = [
  "peony",
  "coral",
  "saffron",
  "maple",
  "pistachio",
  "verdant",
  "aqua",
  "sapphire",
  "amethyst",
] as const satisfies readonly COLORS[];

const COLOR_IMAGES: Record<COLORS, StaticImageData> = {
  peony: peonyImage,
  coral: coralImage,
  saffron: saffronImage,
  maple: mapleImage,
  pistachio: pistachioImage,
  verdant: verdantImage,
  aqua: aquaImage,
  sapphire: sapphireImage,
  amethyst: amethystImage,
};

function CustomizeLook() {
  const { userId } = useAuth();
  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

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
    onError: (e) => {
      console.error(e);
    },
  });

  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);

  function selectColor(nextColor: COLORS) {
    updateCSSThemeVars(nextColor, theme, { animate: true });
    setColor(nextColor);
    window.localStorage.setItem("autostrum-color", nextColor);

    if (userId) {
      updateDBColor(nextColor);
    }
  }

  return (
    <section className="baseVertFlex w-full max-w-[1200px] !items-start gap-6 px-4 md:px-6 lg:px-8">
      <div className="baseVertFlex w-full !items-start gap-2">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          Customize your look
        </h2>
        <p className="max-w-2xl text-sm text-foreground/80 md:text-base">
          Nine accent colors and light, dark, or system theme — saved for you
          when you&apos;re signed in.
        </p>
      </div>

      <div className="baseVertFlex w-full gap-6 rounded-xl border bg-background p-5 shadow-md md:p-8 lg:flex-row lg:!items-start lg:gap-10">
        <div className="baseVertFlex w-full !items-start gap-5">
          <div className="baseVertFlex w-full !items-start gap-2">
            <span className="font-medium sm:text-lg">Color</span>
            <Separator className="h-px w-full bg-foreground/40" />
            <div className="mt-1 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
              {COLORS_LIST.map((colorString) => {
                const selected = color === colorString;
                const showRing = selected || hoveredColor === colorString;

                // <div
                //   key={colorString}
                //   style={{
                //     backgroundColor: COLOR_HEX_VALUES[colorString],
                //   }}
                //   className={`baseVertFlex group relative h-36 w-full cursor-pointer !items-start !justify-start !overflow-hidden rounded-lg p-4 text-primary-foreground shadow-md transition-all hover:shadow-lg sm:p-6`}
                // >
                //   <div
                //     style={{
                //       backgroundColor: COLOR_HEX_VALUES[colorString],
                //     }}
                //     className="absolute inset-0 z-10 size-full overflow-hidden opacity-40 lg:hidden"
                //   ></div>

                //   {/* z-index as fallback just in case for weird safari positioning */}
                //   <p className="z-10 text-lg font-semibold drop-shadow-xl lg:drop-shadow-none">
                //     {`${colorString.charAt(0).toUpperCase()}${colorString.slice(1)}`}
                //   </p>

                //   <Image
                //     src={COLOR_IMAGES[colorString]}
                //     alt={`${colorString} `}
                //     // had to do some magic number positioning/width/clip-path to reduce visible 1px of bg color on right side of desktop card
                //     className="pointer-events-none absolute bottom-0 right-[-1px] h-full w-[calc(100%+1px)] max-w-none select-none rounded-lg object-cover object-center opacity-75 lg:rounded-none lg:[clip-path:polygon(50%_0%,101%_0%,101%_100%,40%_100%)]"
                //   />
                // </div>
                return (
                  <button
                    key={colorString}
                    type="button"
                    onMouseEnter={() => setHoveredColor(colorString)}
                    onMouseLeave={() => setHoveredColor(null)}
                    onFocus={() => setHoveredColor(colorString)}
                    onBlur={() => setHoveredColor(null)}
                    onClick={() => selectColor(colorString)}
                    className="group relative h-24 overflow-hidden rounded-lg border border-gray text-left shadow-sm transition hover:brightness-105 active:brightness-100 sm:h-36"
                    aria-pressed={selected}
                    aria-label={`Select ${colorString} color`}
                  >
                    <Image
                      src={COLOR_IMAGES[colorString]}
                      alt=""
                      fill
                      sizes="500px"
                      className="object-cover transition duration-300 group-hover:scale-[1.04]"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, ${COLOR_HEX_VALUES[colorString]}cc, ${COLOR_HEX_VALUES[colorString]}55 45%, transparent)`,
                      }}
                    />
                    <div className="baseFlex absolute inset-x-0 bottom-0 !justify-between gap-2 p-2.5">
                      <span className="text-sm font-semibold text-white drop-shadow">
                        {colorString.charAt(0).toUpperCase() +
                          colorString.slice(1)}
                      </span>
                      <span
                        className="relative size-5 rounded-full border border-white/70 shadow-sm"
                        style={{
                          backgroundColor: COLOR_HEX_VALUES[colorString],
                        }}
                      >
                        <AnimatePresence>
                          {showRing && (
                            <motion.div
                              key={`ring-${colorString}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              style={{
                                borderColor:
                                  NEAR_WHITE_COLOR_VALUES[colorString],
                              }}
                              className="absolute inset-0 rounded-full border-2"
                            />
                          )}
                        </AnimatePresence>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="baseVertFlex w-full !items-start gap-2">
            <span className="font-medium sm:text-lg">Theme</span>
            <Separator className="h-px w-full bg-foreground/40" />
            <div className="mt-1 grid w-full grid-cols-3 gap-2">
              <ThemeOption
                label="Light"
                active={!followsDeviceTheme && theme === "light"}
                hovered={hoveredTheme === "light"}
                onHoverStart={() => setHoveredTheme("light")}
                onHoverEnd={() => setHoveredTheme(null)}
                onClick={() => {
                  updateCSSThemeVars(color, "light", { animate: true });
                  setTheme("light");
                  setFollowsDeviceTheme(false);
                  window.localStorage.setItem("autostrum-theme", "light");
                  window.localStorage.setItem(
                    "autostrum-follows-device-theme",
                    "false",
                  );
                }}
                icon={<IoSunnyOutline className="size-6 text-foreground" />}
              />
              <ThemeOption
                label="Dark"
                active={!followsDeviceTheme && theme === "dark"}
                hovered={hoveredTheme === "dark"}
                onHoverStart={() => setHoveredTheme("dark")}
                onHoverEnd={() => setHoveredTheme(null)}
                onClick={() => {
                  updateCSSThemeVars(color, "dark", { animate: true });
                  setTheme("dark");
                  setFollowsDeviceTheme(false);
                  window.localStorage.setItem("autostrum-theme", "dark");
                  window.localStorage.setItem(
                    "autostrum-follows-device-theme",
                    "false",
                  );
                }}
                icon={<IoMoonOutline className="size-6 text-foreground" />}
              />
              <ThemeOption
                label="System"
                active={followsDeviceTheme}
                hovered={hoveredTheme === "system"}
                onHoverStart={() => setHoveredTheme("system")}
                onHoverEnd={() => setHoveredTheme(null)}
                onClick={() => {
                  const systemTheme = window.matchMedia(
                    "(prefers-color-scheme: dark)",
                  ).matches
                    ? "dark"
                    : "light";
                  updateCSSThemeVars(color, systemTheme, { animate: true });
                  setTheme(systemTheme);
                  setFollowsDeviceTheme(true);
                  window.localStorage.setItem("autostrum-theme", systemTheme);
                  window.localStorage.setItem(
                    "autostrum-follows-device-theme",
                    "true",
                  );
                }}
                icon={
                  <HiMiniComputerDesktop className="size-6 text-foreground" />
                }
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ThemeOption({
  label,
  active,
  hovered,
  onHoverStart,
  onHoverEnd,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  hovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <div className="baseVertFlex w-full gap-1">
      <Button
        variant="theme"
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        onTouchStart={onHoverStart}
        onTouchEnd={onHoverEnd}
        onTouchCancel={onHoverEnd}
        onClick={onClick}
        className="relative !size-12 !rounded-full !p-0"
        aria-pressed={active}
        aria-label={`Select ${label} theme`}
      >
        {icon}
        <AnimatePresence>
          {(active || hovered) && (
            <motion.div
              key={`theme-ring-${label}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 rounded-full border-2 border-foreground"
            />
          )}
        </AnimatePresence>
      </Button>
      <span className={`text-sm font-medium ${active ? "" : "opacity-50"}`}>
        {label}
      </span>
    </div>
  );
}

export default CustomizeLook;
