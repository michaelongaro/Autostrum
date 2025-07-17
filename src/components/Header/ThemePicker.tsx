import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { IoSunnyOutline, IoMoonOutline } from "react-icons/io5";
import { HiMiniComputerDesktop } from "react-icons/hi2";
import { updateCSSThemeVars } from "~/utils/updateCSSThemeVars";
import { api } from "~/utils/api";
import { useTabStore } from "~/stores/TabStore";
import { useAuth } from "@clerk/nextjs";

const COLORS = [
  "peony",
  "quartz",
  "crimson",
  "saffron",
  "pistachio",
  "verdant",
  "aqua",
  "azure",
  "amethyst",
] as const;

const COLOR_HEX_VALUES: Record<(typeof COLORS)[number], string> = {
  peony: "#E93D82",
  quartz: "#CA244D",
  crimson: "#CE2C31",
  saffron: "#F76B15",
  pistachio: "#46A758",
  verdant: "#12A594",
  aqua: "#00A2C7",
  azure: "#0D74CE",
  amethyst: "#8E4EC6",
};

function ThemePicker() {
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

  return (
    <div className="baseVertFlex mt-4 w-full !items-start tablet:mt-0">
      <span className="font-medium sm:text-lg">Color</span>
      <Separator className="h-[1px] bg-foreground/50" />

      <div className="mt-2 grid w-full grid-cols-3 grid-rows-3 gap-2">
        {COLORS.map((colorString) => (
          <div key={colorString} className="baseVertFlex w-full gap-1">
            <Button
              variant={"outline"}
              onClick={() => {
                updateCSSThemeVars(colorString, theme);
                setColor(colorString);
                window.localStorage.setItem("autostrum-color", colorString);

                if (userId) {
                  updateDBColor({ userId, color: colorString });
                }
              }}
              style={{ backgroundColor: COLOR_HEX_VALUES[colorString] }}
              className={`!size-12 !rounded-full !p-0`}
            ></Button>
            <span
              className={`text-sm font-medium transition-all ${color === colorString ? "" : "opacity-50"}`}
            >
              {colorString.charAt(0).toUpperCase() + colorString.slice(1)}
            </span>
          </div>
        ))}
      </div>

      <span className="mt-2 font-medium sm:mt-4 sm:text-lg">Theme</span>
      <Separator className="h-[1px] bg-foreground/50" />

      <div className="mt-2 grid w-full grid-cols-3 grid-rows-1 gap-2">
        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
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
            className="!size-12 !rounded-full !p-0"
          >
            <IoSunnyOutline className="size-6 text-foreground" />
          </Button>
          <span
            className={`text-sm font-medium ${!followsDeviceTheme && theme === "light" ? "" : "opacity-50"}`}
          >
            Light
          </span>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
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
            className="!size-12 !rounded-full !p-0"
          >
            <IoMoonOutline className="size-6 text-foreground" />
          </Button>
          <span
            className={`text-sm font-medium ${!followsDeviceTheme && theme === "dark" ? "" : "opacity-50"}`}
          >
            Dark
          </span>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
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
            className="!size-12 !rounded-full !p-0"
          >
            <HiMiniComputerDesktop className="size-6 text-foreground" />
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
