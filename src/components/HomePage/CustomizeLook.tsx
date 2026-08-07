import Image, { type StaticImageData } from "next/image";
import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { HiMiniComputerDesktop } from "react-icons/hi2";
import { IoMoonOutline, IoSunnyOutline } from "react-icons/io5";
import HeaderLogo from "~/components/Header/HeaderLogo";
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

import amethystImage from "public/genreThumbnails/metal.webp";
import aquaImage from "public/genreThumbnails/blues.webp";
import coralImage from "public/genreThumbnails/rock.webp";
import mapleImage from "public/genreThumbnails/folk.webp";
import peonyImage from "public/genreThumbnails/pop.webp";
import pistachioImage from "public/genreThumbnails/indie.webp";
import saffronImage from "public/genreThumbnails/country.webp";
import sapphireImage from "public/genreThumbnails/jazz.webp";
import verdantImage from "public/genreThumbnails/classical.webp";

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
        <div className="baseVertFlex w-full max-w-sm gap-4 rounded-lg border bg-secondary-active/30 p-5">
          <HeaderLogo
            width={isAboveMediumViewportWidth ? 220 : 180}
            height={isAboveMediumViewportWidth ? 38 : 32}
          />
          <div className="baseVertFlex w-full !items-start gap-2 rounded-md border bg-background p-4 shadow-sm">
            <p className="text-sm font-semibold">Live preview</p>
            <p className="text-xs text-foreground/70">
              Accents, buttons, and the logo update with your selection.
            </p>
            <div className="baseFlex mt-1 !justify-start gap-2">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="outline">
                Outline
              </Button>
              <Button size="sm" variant="audio" className="!px-3">
                Audio
              </Button>
            </div>
          </div>
          <p className="text-xs text-foreground/60">
            Current:{" "}
            <span className="font-medium text-foreground">
              {color.charAt(0).toUpperCase() + color.slice(1)}
            </span>
            {" · "}
            {followsDeviceTheme
              ? "System"
              : theme.charAt(0).toUpperCase() + theme.slice(1)}
          </p>
        </div>

        <div className="baseVertFlex w-full !items-start gap-5">
          <div className="baseVertFlex w-full !items-start gap-2">
            <span className="font-medium sm:text-lg">Color</span>
            <Separator className="h-px w-full bg-foreground/40" />
            <div className="mt-1 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
              {COLORS_LIST.map((colorString) => {
                const selected = color === colorString;
                const showRing =
                  selected || hoveredColor === colorString;

                return (
                  <button
                    key={colorString}
                    type="button"
                    onMouseEnter={() => setHoveredColor(colorString)}
                    onMouseLeave={() => setHoveredColor(null)}
                    onFocus={() => setHoveredColor(colorString)}
                    onBlur={() => setHoveredColor(null)}
                    onClick={() => selectColor(colorString)}
                    className="group relative h-24 overflow-hidden rounded-lg border text-left shadow-sm transition hover:brightness-105 active:brightness-100"
                    aria-pressed={selected}
                    aria-label={`Select ${colorString} color`}
                  >
                    <Image
                      src={COLOR_IMAGES[colorString]}
                      alt=""
                      fill
                      sizes="160px"
                      className="object-cover transition duration-300 group-hover:scale-[1.04]"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, ${COLOR_HEX_VALUES[colorString]}cc, ${COLOR_HEX_VALUES[colorString]}55 45%, transparent)`,
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 baseFlex !justify-between gap-2 p-2.5">
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
      <span
        className={`text-sm font-medium ${active ? "" : "opacity-50"}`}
      >
        {label}
      </span>
    </div>
  );
}

export default CustomizeLook;
