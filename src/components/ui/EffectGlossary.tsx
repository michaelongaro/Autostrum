import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";

interface EffectGlossary {
  forModal?: boolean;
}

function EffectGlossary({ forModal = false }: EffectGlossary) {
  const { showingEffectGlossary, setShowingEffectGlossary } = useTabStore(
    (state) => ({
      showingEffectGlossary: state.showingEffectGlossary,
      setShowingEffectGlossary: state.setShowingEffectGlossary,
    }),
    shallow
  );

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        setShowingEffectGlossary(open ? true : false);
      }}
      modal={false}
      open={forModal ? true : showingEffectGlossary}
    >
      <DropdownMenuTrigger asChild>
        {!forModal ? (
          <Button variant={"secondary"} className="baseFlex gap-2">
            Effect glossary
            <span className="w-2">{showingEffectGlossary ? "-" : "+"}</span>
          </Button>
        ) : (
          // just a placeholder anchor for the content to attach to
          <div></div>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side={"bottom"}>
        <DropdownMenuLabel>Section effects</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">PM</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Palm mute</span>
        </DropdownMenuItem>
        <DropdownMenuLabel>Note effects (one per note)</DropdownMenuLabel>
        <DropdownMenuSeparator />
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
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">b</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Bend</span>
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
        <DropdownMenuLabel>Miscellaneous</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="grid w-48 grid-cols-5">
          <span className="col-span-1">|</span>
          <span className="col-span-1">-</span>
          <span className="col-span-3">Measure line</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default EffectGlossary;
