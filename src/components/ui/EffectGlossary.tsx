import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdownMenu";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

interface EffectGlossary {
  forModal?: boolean;
}

interface Styles {
  padding: string;
  width: string;
  height: string;
  border?: string;
}

function EffectGlossary({ forModal = false }: EffectGlossary) {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const { showingEffectGlossary, setShowingEffectGlossary } = useTabStore(
    (state) => ({
      showingEffectGlossary: state.showingEffectGlossary,
      setShowingEffectGlossary: state.setShowingEffectGlossary,
    }),
    shallow
  );

  const style: Styles = {
    padding: forModal ? "0" : "0.5rem 1rem",
    width: forModal ? "0" : "auto",
    height: forModal ? "0" : "2.5rem",
  };

  if (forModal) {
    style.border = "none";
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        setShowingEffectGlossary(open ? true : false);
      }}
      modal={false}
      open={forModal ? true : showingEffectGlossary}
    >
      <DropdownMenuTrigger
        // not ideal, I feel like you can change source code to make DropdownMenuTrigger return a div
        // instead of a button. This was getting angry that there was a button within a button hydration-wise
        style={style}
        className="baseFlex lightGlassmorphic active:ring-offset-background~ ml-8 inline-flex h-10 items-center justify-center gap-4 rounded-md border-2 px-4 py-2 text-sm font-medium text-secondary-foreground ring-offset-background transition-all hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:ring-0 active:ring-offset-0 active:brightness-75 disabled:pointer-events-none disabled:opacity-50"
      >
        {!forModal && (
          <>
            Effect glossary
            <span className="w-2">{showingEffectGlossary ? "-" : "+"}</span>
          </>
        )}
      </DropdownMenuTrigger>

      {/* doesn't look cohesive when below styles are present, any other solution besides changing
          all other dropdown-esque ui components to match this? */}
      {/* className="heavyGlassmorphic text-pink-900" */}
      <DropdownMenuContent side={aboveMediumViewportWidth ? "right" : "bottom"}>
        <DropdownMenuLabel>Section effects</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">PM</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Palm mute</span>
        </DropdownMenuItem>
        <DropdownMenuLabel>Note effects</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* maybe add O and o for clarity on each */}
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">|</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Measure line</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">x</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Muted note</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">h</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Hammer on</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">p</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Pull off</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">/</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Slide up</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">\</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Slide down</span>
        </DropdownMenuItem>
        <DropdownMenuLabel>Chord effects</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">^</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Strum up</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">v</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Strum down</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">s</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Slap</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">{">"}</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Accented</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">.</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Stacatto</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default EffectGlossary;
