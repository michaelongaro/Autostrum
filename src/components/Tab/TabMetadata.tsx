import { useState, useMemo, type ChangeEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/router";
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
import isEqual from "lodash.isequal";
import { type Genre } from "@prisma/client";
import { AiOutlineHeart } from "react-icons/ai";
import { parse, toString } from "~/utils/tunings";

import classes from "./TabMetadata.module.css";

function TabMetadata() {
  const { userId, isLoaded } = useAuth();
  const { asPath } = useRouter();

  const [showPulsingError, setShowPulsingError] = useState(false);

  const genreArray = api.genre.getAll.useQuery();

  const genreObject: Record<number, Genre> = useMemo(() => {
    if (!genreArray.data) return {};

    return genreArray.data.reduce((acc: Record<number, Genre>, genre) => {
      acc[genre.id] = genre;
      return acc;
    }, {});
  }, [genreArray.data]);

  const {
    originalTabData,
    id,
    createdById,
    createdAt,
    title,
    setTitle,
    description,
    setDescription,
    genreId,
    setGenreId,
    tuning,
    tabData,
    bpm,
    setBpm,
    timeSignature,
    setTimeSignature,
    capo,
    setCapo,
    editing,
    setEditing,
  } = useTabStore(
    (state) => ({
      originalTabData: state.originalTabData,
      id: state.id,
      createdById: state.createdById,
      createdAt: state.createdAt,
      title: state.title,
      setTitle: state.setTitle,
      description: state.description,
      setDescription: state.setDescription,
      genreId: state.genreId,
      setGenreId: state.setGenreId,
      tuning: state.tuning,
      bpm: state.bpm,
      setBpm: state.setBpm,
      tabData: state.tabData,
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

  function handleBpmChange(event: ChangeEvent<HTMLInputElement>) {
    const inputValue = event.target.value;

    // Check if the input value is empty (backspace case) or a number between 1 and 200
    if (
      inputValue === "" ||
      (Number(inputValue) >= 1 && Number(inputValue) <= 200)
    ) {
      setBpm(Number(inputValue) === 0 ? null : Number(inputValue));
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

  function handlePreview() {
    if (!title || !genreId || !tuning || !bpm) {
      setShowPulsingError(true);
      setTimeout(() => setShowPulsingError(false), 500);

      return;
    }

    setEditing(false);
  }

  function handleSave() {
    if (!title || !genreId || !tuning || !bpm) {
      setShowPulsingError(true);
      setTimeout(() => setShowPulsingError(false), 500);

      return;
    }

    // update in prisma
  }

  function isEqualToOriginalTabState() {
    if (!originalTabData) return false;

    // could have opted to use Omit<> as well..
    const { createdAt, ...sanitizedOriginalTabData } = originalTabData;

    const sanitizedCurrentTabData = {
      id,
      title,
      description,
      genreId,
      tabData,
      tuning,
      bpm,
      timeSignature,
      capo,
      createdById,
    };

    return isEqual(sanitizedOriginalTabData, sanitizedCurrentTabData);
  }

  function getOrdinalSuffix(num: number) {
    const j = num % 10,
      k = num % 100;
    if (j === 1 && k !== 11) {
      return `${num}st`;
    }
    if (j === 2 && k !== 12) {
      return `${num}nd`;
    }
    if (j === 3 && k !== 13) {
      return `${num}rd`;
    }
    return `${num}th`;
  }

  function formatDate(date: Date) {
    const d = new Date(date);
    let month = ` ${d.getMonth() + 1}`;
    let day = `  ${d.getDate()}`;
    const year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [month, day, year].join(" - ");
  }

  return (
    <>
      {editing ? (
        <>
          <div className={classes.editingMetadataContainer}>
            <div className="baseFlex absolute right-2 top-2 gap-2 lg:right-4 lg:top-4">
              {!asPath.includes("create") && (
                <Button
                  variant={"destructive"}
                  onClick={() => {
                    // bring up modal to confirm deletion
                    // delete tab and redirect to wherever user came from before editing
                  }}
                >
                  Delete
                </Button>
              )}
              <Button disabled={showPulsingError} onClick={handlePreview}>
                Preview
              </Button>

              <Button
                // eventually add loading spinner here while saving
                disabled={isEqualToOriginalTabState() || showPulsingError}
                // need to compare the current state of the tab to the initial state
                onClick={handleSave}
              >
                {asPath.includes("create") ? "Publish" : "Save"}
              </Button>
            </div>

            <div
              className={`${
                classes.title ?? ""
              } baseVertFlex w-full !items-start gap-1.5`}
            >
              <Label htmlFor="title">
                Title <span className="text-brightRed">*</span>
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="My new tab"
                value={title}
                style={{
                  boxShadow:
                    showPulsingError && !title
                      ? "0 0 0 0.25rem hsl(0deg 100% 50%)"
                      : "0 0 0 0 transparent",
                  animationPlayState:
                    showPulsingError && !title ? "running" : "paused",
                  // could add below box shadow styles into tailwind too!
                  transitionProperty: "box-shadow",
                  transitionTimingFunction: "ease-in-out",
                  transitionDuration: "500ms",
                }}
                className="animate-errorShake"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div
              className={`${
                classes.description ?? ""
              } baseVertFlex w-full !items-start gap-1.5`}
            >
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add any specific info about how to play this tab."
                value={description ?? ""}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div
              className={`${
                classes.genre ?? ""
              } baseVertFlex !items-start gap-1.5`}
            >
              <Label>
                Genre <span className="text-brightRed">*</span>
              </Label>
              <Select
                value={genreObject[genreId]?.id.toString()}
                onValueChange={(value) => handleGenreChange(value)}
              >
                <SelectTrigger
                  style={{
                    boxShadow:
                      showPulsingError && genreId === -1
                        ? "0 0 0 0.25rem hsl(0deg 100% 50%)"
                        : "0 0 0 0 transparent",
                    animationPlayState:
                      showPulsingError && genreId === -1 ? "running" : "paused",
                    // could add below box shadow styles into tailwind too!
                    transitionProperty: "box-shadow",
                    transitionTimingFunction: "ease-in-out",
                    transitionDuration: "500ms",
                  }}
                  className="w-[180px] animate-errorShake"
                >
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

            <div
              className={`${
                classes.tuning ?? ""
              } baseVertFlex max-w-sm !items-start gap-1.5`}
            >
              <Label htmlFor="tuning">
                Tuning <span className="text-brightRed">*</span>
              </Label>
              {/* TODO: ability to add custom tunings */}
              <CommandCombobox showPulsingError={showPulsingError} />
            </div>

            <div
              className={`${
                classes.capo ?? ""
              } baseVertFlex w-16 max-w-sm !items-start gap-1.5`}
            >
              <Label htmlFor="capo">Capo</Label>
              <Input
                type="text"
                placeholder="0"
                value={capo ?? ""}
                onChange={handleCapoChange}
              />
            </div>

            <div
              className={`${
                classes.bpm ?? ""
              } baseVertFlex relative w-16 max-w-sm !items-start gap-1.5`}
            >
              <Label htmlFor="bpm">
                BPM <span className="text-brightRed">*</span>
              </Label>
              <Input
                type="text"
                placeholder="75"
                value={bpm ?? ""}
                style={{
                  boxShadow:
                    showPulsingError && bpm === null
                      ? "0 0 0 0.25rem hsl(0deg 100% 50%)"
                      : "0 0 0 0 transparent",
                  animationPlayState:
                    showPulsingError && bpm === null ? "running" : "paused",
                  // could add below box shadow styles into tailwind too!
                  transitionProperty: "box-shadow",
                  transitionTimingFunction: "ease-in-out",
                  transitionDuration: "500ms",
                }}
                className="animate-errorShake"
                onChange={handleBpmChange}
              />
            </div>

            <div
              className={`${
                classes.timingSignature ?? ""
              } baseVertFlex w-16 max-w-sm !items-start gap-1.5`}
            >
              <Label htmlFor="timing">Timing</Label>
              <Input
                type="text"
                placeholder="4/4"
                value={timeSignature ?? ""}
                onChange={handleTimeSignatureChange}
              />
            </div>
          </div>
        </>
      ) : (
        <div
          style={{
            minHeight: description ? "300px" : "150px",
          }}
          className="w-full"
        >
          {userId && createdById === userId && (
            <Button
              className="absolute right-2 top-2 md:right-4 md:top-4"
              onClick={() => {
                setEditing(true);
              }}
            >
              {asPath.includes("edit") || asPath.includes("create")
                ? "Continue editing"
                : "Edit"}
            </Button>
          )}

          {/* if you still wanted to add "forking" functionality, then that would go here */}

          <div
            className={`${
              classes.headerInfo ?? ""
            } lightGlassmorphic w-full rounded-t-md shadow-sm`}
          >
            <div className="baseFlex gap-2">
              <div className={`${classes.title ?? ""} text-2xl font-bold`}>
                {title}
              </div>

              <div className={classes.heart}>
                {/* could definitely just use the icon instead of button wrapper as well */}
                <Button
                  variant={"ghost"}
                  className="p-2"
                  onClick={() => handleLike()}
                >
                  <AiOutlineHeart className="h-6 w-6" />
                </Button>
              </div>
            </div>

            {/* prob are going to need an updatedAt field on model, and then display the updated one
            if it exists, otherwise createdAt */}
            <Separator
              orientation="vertical"
              className="hidden h-8 w-[1px] bg-pink-50 sm:block"
            />

            <div className={`${classes.usernameAndDate ?? ""} baseFlex gap-2`}>
              <div className="baseFlex gap-2">
                <div className="h-8 w-8 rounded-full bg-pink-800"></div>
                {/* {username ?? "test"} */}
                <span className="text-lg underline underline-offset-2">
                  Leyendo
                </span>
              </div>
              <Separator className="h-[1px] w-4" />
              {`Updated on ${createdAt ? formatDate(createdAt) : ""}`}
            </div>
          </div>

          <div className={classes.metadataContainer}>
            {description && (
              <div
                className={`${
                  classes.description ?? ""
                } baseVertFlex w-full !items-start gap-2`}
              >
                <div className="font-semibold">Description</div>
                <p className="w-full">{description}</p>
              </div>
            )}

            <div className="baseVertFlex w-full gap-4 md:flex-row md:items-start md:gap-8">
              <div className="baseFlex w-full !items-start !justify-evenly md:w-auto md:flex-row md:gap-8">
                <div
                  className={`${
                    classes.genre ?? ""
                  } baseVertFlex !items-start gap-2`}
                >
                  <div className="font-semibold">Genre</div>
                  <div
                    style={{
                      backgroundColor: genreObject[genreId]?.color,
                    }}
                    className={`${
                      classes.genre ?? ""
                    } rounded-md px-16 py-[0.65rem]`}
                  >
                    {/* need bubbles, prob fine to hardcode them tbh */}
                    {genreObject[genreId]?.name}
                  </div>
                </div>
                <div
                  className={`${
                    classes.tuning ?? ""
                  } baseVertFlex !items-start gap-2`}
                >
                  <div className="font-semibold">Tuning</div>
                  <div className="rounded-md border-2 border-pink-50 px-8 py-2 font-semibold ">
                    {toString(parse(tuning), { pad: 2 })}
                  </div>
                </div>
              </div>

              <div className="baseFlex w-full !items-start !justify-evenly md:w-auto md:flex-row md:gap-8">
                <div
                  className={`${
                    classes.bpm ?? ""
                  } baseVertFlex !items-start gap-2`}
                >
                  <div className="font-semibold">BPM</div>
                  <div>{bpm}</div>
                </div>

                {timeSignature && (
                  <div
                    className={`${
                      classes.timingSignature ?? ""
                    } baseVertFlex !items-start gap-2`}
                  >
                    <div className="font-semibold">Timing</div>
                    <div>{timeSignature}</div>
                  </div>
                )}

                {capo && (
                  <div
                    className={`${
                      classes.capo ?? ""
                    } baseVertFlex !items-start gap-2`}
                  >
                    <div className="font-semibold">Capo</div>
                    <div>{`${getOrdinalSuffix(capo)} fret`}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TabMetadata;
