import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { IoSunnyOutline, IoMoonOutline } from "react-icons/io5";
import { HiMiniComputerDesktop } from "react-icons/hi2";

function ThemePicker() {
  return (
    <div className="baseVertFlex mt-4 w-full !items-start gap-2 tablet:mt-0">
      <span className="font-medium">Color</span>
      <Separator className="bg-pink-600" />
      <div className="grid w-full grid-cols-3 grid-rows-3 gap-1">
        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-pink-600 !p-0"
          ></Button>
          <p className="text-sm font-medium">Peony</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-rose-600 !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Quartz</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-red-600 !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Crimson</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-amber-600 !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Saffron</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-lime-600 !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Pistachio</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-green-600 !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Verdant</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-cyan-600 !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Aqua</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-blue-600 !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Azure</p>
        </div>

        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full bg-violet-600 !p-0"
          ></Button>
          <p className="text-sm font-medium opacity-50">Amethyst</p>
        </div>
      </div>

      <span className="mt-2 font-medium">Theme</span>
      <Separator className="bg-pink-600" />
      <div className="grid w-full grid-cols-3 grid-rows-1 gap-1">
        <div className="baseVertFlex w-full gap-1">
          <Button
            variant={"outline"}
            onClick={() => {
              // document.documentElement.setAttribute("data-theme", "light");
            }}
            className="!size-12 !rounded-full !p-0"
          >
            <IoSunnyOutline className="size-6" />
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
            <IoMoonOutline className="size-6" />
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
            <HiMiniComputerDesktop className="size-6" />
          </Button>
          <p className="text-sm font-medium opacity-50">System</p>
        </div>
      </div>
    </div>
  );
}

export default ThemePicker;
