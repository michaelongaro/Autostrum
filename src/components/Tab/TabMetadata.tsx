import { useState, useMemo, type ChangeEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "~/utils/api";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { SelectTrigger } from "../ui/select";
import { SelectValue } from "../ui/select";
import { SelectContent } from "../ui/select";
import { SelectGroup } from "../ui/select";
import { SelectLabel } from "../ui/select";
import { SelectItem } from "../ui/select";
import { Separator } from "../ui/separator";
import { CommandCombobox } from "../ui/CommandCombobox";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { type Genre } from "@prisma/client";
import EffectGlossary from "../ui/EffectGlossary";

function TabMetadata() {
  // TODO: flesh out genre, tuning, and prob "edit" button/ save buttons
  // edit button on hover should show tooltip showing which sections need to be filled out
  // before able to save/upload tab
  const { userId, isLoaded } = useAuth();

  const [showPopover, setShowPopover] = useState(false);

  const genreArray = api.genre.getAll.useQuery();

  const genreObject: Record<number, Genre> = useMemo(() => {
    if (!genreArray.data) return {};

    return genreArray.data.reduce((acc: Record<number, Genre>, genre) => {
      acc[genre.id] = genre;
      return acc;
    }, {});
  }, [genreArray.data]);

  const {
    createdById,
    title,
    setTitle,
    description,
    setDescription,
    genreId,
    setGenreId,
    tuning,
    setTuning,
    BPM,
    setBPM,
    timeSignature,
    setTimeSignature,
    capo,
    setCapo,
    editing,
    setEditing,
  } = useTabStore(
    (state) => ({
      createdById: state.createdById,
      title: state.title,
      setTitle: state.setTitle,
      description: state.description,
      setDescription: state.setDescription,
      genreId: state.genreId,
      setGenreId: state.setGenreId,
      tuning: state.tuning,
      setTuning: state.setTuning,
      BPM: state.BPM,
      setBPM: state.setBPM,
      timeSignature: state.timeSignature,
      setTimeSignature: state.setTimeSignature,
      capo: state.capo,
      setCapo: state.setCapo,
      editing: state.editing,
      setEditing: state.setEditing,
    }),
    shallow
  );

  function handleGenreChange(stringifiedId: string) {
    const id = parseInt(stringifiedId);
    if (isNaN(id)) return;

    setGenreId(id);
  }

  function handleBPMChange(event: ChangeEvent<HTMLInputElement>) {
    const inputValue = event.target.value;

    // Check if the input value is empty (backspace case) or a number between 1 and 200
    if (
      inputValue === "" ||
      (Number(inputValue) >= 1 && Number(inputValue) <= 200)
    ) {
      setBPM(Number(inputValue) === 0 ? null : Number(inputValue));
    }
  }

  function handleTimeSignatureChange(e: ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    const parts = newValue.split("/");
    if (parts.length > 2) return; // only allow one '/'

    for (const part of parts) {
      if (part !== "") {
        // allow empty parts for ongoing inputs like '4/'
        const num = parseInt(part, 10);
        // adjust validation to allow for ongoing inputs like '4/1'
        if (isNaN(num) || num < 1 || (part.length === 2 && num > 20)) return;
      }
    }

    // check if newValue is purely numeric or slash
    const regex = /^[0-9/]*$/;
    if (!regex.test(newValue)) return;

    setTimeSignature(newValue);
  }

  function handleCapoChange(event: ChangeEvent<HTMLInputElement>) {
    const inputValue = event.target.value;

    // Check if the input value is empty (backspace case)
    if (inputValue === "") {
      setCapo(Number(inputValue) === 0 ? null : Number(inputValue));
      return;
    }

    // Check if the input value is a number between 1 and 12
    const num = Number(inputValue);

    if (!isNaN(num) && num >= 1 && num <= 12) {
      setCapo(num);
    }
  }

  return (
    <>
      {editing ? (
        <>
          <div className="baseFlex relative w-full gap-2">
            <div className="absolute right-2 top-2">
              {/* really not sure why positioning on <Tooltip /> was so consistantly off while
                  popover works fine... */}
              {/* disable on hover if it is able to be saved */}
              {/* https://www.radix-ui.com/docs/primitives/components/tooltip#displaying-a-tooltip-from-a-disabled-button */}

              <Popover
                open={showPopover}
                onOpenChange={(open) => {
                  if (open) setShowPopover(false);
                  // only set to true if there are required fields that aren't filled out properly
                  setShowPopover(true);
                }}
              >
                <PopoverTrigger>
                  <Button
                  // disabled={}
                  >
                    Save
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  {/* look to see how to properly format this component to get the close */}
                  {/* <PopoverClose /> */}
                  Place content for the popover here.
                </PopoverContent>
              </Popover>
            </div>

            <div className="baseVertFlex w-full max-w-sm !items-start gap-1.5 md:w-1/2">
              <Label htmlFor="title">
                Title <span className="text-pink-700">*</span>
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="My new tab"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="baseVertFlex w-full max-w-sm !items-start gap-1.5 md:w-1/2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add any specific info about how to play this tab."
                value={description ?? ""}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="baseVertFlex !items-start gap-1.5">
              <Label>
                Genre <span className="text-pink-700">*</span>
              </Label>
              <Select
                value={genreObject[genreId]?.id.toString()}
                onValueChange={(value) => handleGenreChange(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Genres</SelectLabel>

                    {genreArray.data?.map((genre) => {
                      return (
                        <SelectItem key={genre.id} value={genre.id.toString()}>
                          <div className="baseFlex gap-2">
                            <div
                              style={{
                                backgroundColor: genre.color,
                              }}
                              className="h-3 w-3 rounded-full"
                            ></div>
                            {genre.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="baseFlex w-full !items-end gap-2">
            <div className="baseVertFlex max-w-sm !items-start gap-1.5">
              <Label htmlFor="tuning">
                Tuning <span className="text-pink-700">*</span>
              </Label>
              {/* TODO: ability to add custom tunings */}
              <CommandCombobox />
            </div>

            <div className="baseVertFlex w-16 max-w-sm !items-start gap-1.5">
              <Label htmlFor="capo">Capo</Label>
              <Input
                type="text"
                placeholder="0"
                value={capo ?? ""}
                onChange={handleCapoChange}
              />
            </div>

            <div className="baseVertFlex w-16 max-w-sm !items-start gap-1.5">
              <Label htmlFor="bpm">
                BPM <span className="text-pink-700">*</span>
              </Label>
              <Input
                type="text"
                placeholder="75"
                value={BPM ?? ""}
                onChange={handleBPMChange}
              />
            </div>

            <div className="baseVertFlex w-16 max-w-sm !items-start gap-1.5">
              <Label htmlFor="timing">Timing</Label>
              <Input
                type="text"
                placeholder="4/4"
                value={timeSignature ?? ""}
                onChange={handleTimeSignatureChange}
              />
            </div>

            <div className="hidden md:block">
              <EffectGlossary />
            </div>
          </div>
        </>
      ) : (
        <>
          {userId && createdById === parseInt(userId) && (
            <Button
              className="absolute right-4 top-4"
              onClick={() => {
                setEditing(true);
              }}
            >
              Edit
            </Button>
          )}

          <div className="baseFlex w-full max-w-sm gap-1.5 md:w-1/2">
            <div className="text-lg font-bold">{title}</div>
            <div
              style={{
                backgroundColor: genreObject[genreId]?.color,
              }}
              className="baseFlex gap-2 p-4"
            >
              {genreObject[genreId]?.name}
            </div>
          </div>

          <p>{description}</p>

          <Separator />

          <div className="baseFlex gap-4">
            <div className="baseVertFlex gap-2">
              Tuning
              <div>{tuning}</div>
            </div>

            <div className="baseVertFlex gap-2">
              BPM
              <div>{BPM}</div>
            </div>

            <div className="baseVertFlex gap-2">
              Timing
              <div>{timeSignature}</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default TabMetadata;
