import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { IoSunnyOutline, IoMoonOutline } from "react-icons/io5";
import { HiMiniComputerDesktop } from "react-icons/hi2";

function ThemePicker() {
  // light/dark theme change should probably call handleThemeChange() after adding/removing
  // the "dark" class to the document element, right?

  function getNewThemeColors(color: string) {
    return {
      background: `var(--${color}-8)`,
      // TODO: find out and fill the rest of these to have 1-1 list for all tailwind
      // color vars
    };
  }

  function handleThemeChange(color: string) {
    // set all css vars to new colors
    const newColors = getNewThemeColors(color);

    document.documentElement.style.setProperty(
      "--background",
      newColors.background,
    );
    // TODO

    // test out transitioning all colors/background colors here too
  }

  return (
    <div className="baseVertFlex mt-4 w-full !items-start gap-2 tablet:mt-0">
      <span className="font-medium">Color</span>
      <Separator className="bg-primary" />
      <div className="grid w-full grid-cols-3 grid-rows-3 gap-1">
        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-[#E93D82] !p-0"
          ></Button>
          <p className="text-sm font-medium">Peony</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-[#CA244D] !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Quartz</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-[#CE2C31] !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Crimson</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-[#F76B15] !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Saffron</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-[#46A758] !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Pistachio</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-[#12A594] !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Verdant</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-[#00A2C7] !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Aqua</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-[#0D74CE] !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Azure</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-[#8E4EC6] !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Amethyst</p>
        </div>
      </div>

      <span className="mt-2 font-medium">Theme</span>
      <Separator className="bg-primary" />
      <div className="grid w-full grid-cols-3 grid-rows-1 gap-1">
        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full !p-0"
          >
            <IoSunnyOutline className="size-6 text-foreground" />
          </Button>
          <p className="text-sm font-medium">Light</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full !p-0"
          >
            <IoMoonOutline className="size-6 text-foreground" />
          </Button>
          <p className="text-sm font-medium opacity-50">Dark</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full !p-0"
          >
            <HiMiniComputerDesktop className="size-6 text-foreground" />
          </Button>
          <p className="text-sm font-medium opacity-50">System</p>
        </div>
      </div>
    </div>
  );
}

export default ThemePicker;
