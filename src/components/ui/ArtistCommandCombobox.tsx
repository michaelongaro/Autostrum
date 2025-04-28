"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { MdModeEditOutline } from "react-icons/md";
import { cn } from "~/utils/cn";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useTabStore } from "~/stores/TabStore";
import { tunings } from "~/utils/tunings";
import { PrettyTuning } from "~/components/ui/PrettyTuning";

// currently hardcoding this component to work with tunings
// but may need to be more generic in the future

interface ArtistCommandCombobox {
  customTuning: string | null;
}

function ArtistCommandCombobox({ customTuning }: ArtistCommandCombobox) {
  const [open, setOpen] = useState(false);

  const { tuning, setTuning, setShowCustomTuningModal } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      setTuning: state.setTuning,
      setShowCustomTuningModal: state.setShowCustomTuningModal,
    }),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-[175px] max-w-[200px] justify-between"
        >
          Select artist...
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        style={{
          textShadow: "none",
        }}
        className="w-[300px] p-0"
      >
        <Command>
          <CommandInput placeholder="Search tunings..." />

          <div className="h-[1px] w-full bg-pink-800"></div>

          <CommandList>
            <CommandEmpty>
              <div className="baseVertFlex gap-2">
                No results found for `search query`.
                <span>
                  `search query` will be added to our database when you publish
                  this tab
                </span>
              </div>
            </CommandEmpty>

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
                        : "opacity-0",
                    )}
                  />
                  <div className="baseFlex w-full !justify-between">
                    <div className="font-medium">{tuningObj.name}</div>
                    <PrettyTuning tuning={tuningObj.simpleNotes} width="w-36" />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          <div className="h-[1px] w-full bg-pink-800"></div>

          {customTuning ? (
            <CommandItem
              className="m-1"
              value={customTuning}
              onSelect={(currentValue) => {
                setTuning(currentValue);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4 shrink-0",
                  tuning.toLowerCase() === customTuning.toLowerCase()
                    ? "opacity-100"
                    : "opacity-0",
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

                <PrettyTuning tuning={customTuning} width="w-36" />
              </div>
            </CommandItem>
          ) : (
            <div className="baseFlex my-2 w-full">
              <Button
                size="sm"
                onClick={() => {
                  setShowCustomTuningModal(true);
                  setOpen(false);
                }}
              >
                Create a custom tuning
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default ArtistCommandCombobox;
