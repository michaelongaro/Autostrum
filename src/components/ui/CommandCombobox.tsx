"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "~/utils/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import tunings from "~/utils/tunings";

// currently hardcoding this component to work with tunings
// but may need to be more generic in the future

interface CommandCombobox {
  showPulsingError: boolean;
}

export function CommandCombobox({ showPulsingError }: CommandCombobox) {
  const [open, setOpen] = React.useState(false);

  const { tuning, setTuning } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      setTuning: state.setTuning,
    }),
    shallow
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          style={{
            boxShadow:
              showPulsingError && tuning === ""
                ? "0 0 0 0.25rem hsl(0deg 100% 50%)"
                : "0 0 0 0 transparent",
            animationPlayState:
              showPulsingError && tuning === "" ? "running" : "paused",
            // could add below box shadow styles into tailwind too!
            transitionProperty: "box-shadow",
            transitionTimingFunction: "ease-in-out",
            transitionDuration: "500ms",
          }}
          className="w-[200px] animate-errorShake justify-between"
        >
          {tuning
            ? tunings.find(
                (tuningObj) =>
                  tuningObj.notes.toLowerCase() === tuning.toLowerCase()
              )?.simpleNotes
            : "Select tuning..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search tunings..." />
          <CommandEmpty>No tuning found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {/* named tuningObj instead of tuning to avoid name conflict w/ tuning from store */}
            {tunings.map((tuningObj) => (
              <CommandItem
                key={tuningObj.simpleNotes}
                value={tuningObj.notes}
                onSelect={(currentValue) => {
                  // prob need to error handle for custom tunings?

                  setTuning(currentValue === tuning ? "" : currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    tuning.toLowerCase() === tuningObj.notes.toLowerCase()
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                <div className="baseFlex w-full !justify-between">
                  <div className="font-medium">{tuningObj.name}</div>
                  <pre>{tuningObj.simpleNotes}</pre>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
