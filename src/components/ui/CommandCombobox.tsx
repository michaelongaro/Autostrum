"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { MdModeEditOutline } from "react-icons/md";
import { cn } from "~/utils/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import tunings, { parse, toString } from "~/utils/tunings";

// currently hardcoding this component to work with tunings
// but may need to be more generic in the future

interface CommandCombobox {
  customTuning: string;
}

export function CommandCombobox({ customTuning }: CommandCombobox) {
  const [open, setOpen] = useState(false);

  const { tuning, setTuning, setShowCustomTuningModal } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      setTuning: state.setTuning,
      setShowCustomTuningModal: state.setShowCustomTuningModal,
    }),
    shallow
  );

  function tuningIsCustom(tuning: string) {
    return (
      tuning &&
      tunings.every(
        (tuningObj) => tuningObj.notes.toLowerCase() !== tuning.toLowerCase()
      )
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {tuning
            ? tuningIsCustom(tuning)
              ? toString(parse(tuning), { pad: 2 })
              : tunings.find(
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

          <CommandSeparator />

          <CommandGroup className="baseFlex my-2 w-full">
            {customTuning ? (
              <CommandItem
                className="w-full"
                value={customTuning}
                onSelect={(currentValue) => {
                  setTuning(currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    tuning.toLowerCase() === customTuning.toLowerCase()
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                <div className="baseFlex w-full !justify-between gap-3 px-2">
                  <Button
                    size="sm"
                    className="baseFlex gap-2"
                    onClick={() => {
                      setShowCustomTuningModal(true);
                      setOpen(false);
                    }}
                  >
                    Edit
                    <MdModeEditOutline className="h-4 w-4" />
                  </Button>

                  <pre>{toString(parse(customTuning), { pad: 2 })}</pre>
                </div>
              </CommandItem>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setShowCustomTuningModal(true);
                  setOpen(false);
                }}
              >
                Create custom tuning
              </Button>
            )}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup className="max-h-60 overflow-y-auto">
            {/* named tuningObj instead of tuning to avoid name conflict w/ tuning from store */}
            {tunings.map((tuningObj) => (
              <CommandItem
                key={tuningObj.simpleNotes}
                value={tuningObj.notes}
                onSelect={(currentValue) => {
                  setTuning(currentValue);
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
