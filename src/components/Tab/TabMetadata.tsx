import { useAuth } from "@clerk/nextjs";
import { type Genre } from "@prisma/client";
import isEqual from "lodash.isequal";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState, type ChangeEvent } from "react";
import { AiFillEye, AiOutlineUser } from "react-icons/ai";
import { BsArrowRightShort } from "react-icons/bs";
import { FaMicrophoneAlt, FaTrashAlt } from "react-icons/fa";
import { shallow } from "zustand/shallow";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";
import formatDate from "~/utils/formatDate";
import { BsPlus } from "react-icons/bs";
import { parse, toString } from "~/utils/tunings";
import { CommandCombobox } from "../ui/CommandCombobox";
import LikeAndUnlikeButton from "../ui/LikeAndUnlikeButton";
import { Check } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { AnimatePresence, motion } from "framer-motion";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import type { RefetchTab } from "./Tab";
import classes from "./TabMetadata.module.css";
import GenrePreviewBubbles from "./GenrePreviewBubbles";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";

function TabMetadata({ refetchTab }: Partial<RefetchTab>) {
  const { userId, isLoaded } = useAuth();

  const { push, asPath } = useRouter();
  const ctx = api.useContext();

  const [showPublishCriteriaPopover, setShowPublishCriteriaPopover] =
    useState(false);
  const [showPulsingError, setShowPulsingError] = useState(false);
  const [profileImageLoaded, setProfileImageLoaded] = useState(false);

  const overMediumViewportThreshold = useViewportWidthBreakpoint(768);

  const genreArray = api.genre.getAll.useQuery();

  const genreObject: Record<number, Genre> = useMemo(() => {
    if (!genreArray.data) return {};

    return genreArray.data.reduce((acc: Record<number, Genre>, genre) => {
      acc[genre.id] = genre;
      return acc;
    }, {});
  }, [genreArray.data]);

  // shouldn't need to be optimistic I don't think, try to keep that just for
  // operations that *need* to be perceived as instant
  const { mutate: createOrUpdate, isLoading: isPosting } =
    api.tab.createOrUpdate.useMutation({
      onSuccess: async (tab) => {
        if (tab) {
          if (asPath.includes("create")) {
            await push(`/tab/${tab.id}`);
          }

          setOriginalTabData(tab);
        }
      },
      onError: (e) => {
        //  const errorMessage = e.data?.zodError?.fieldErrors.content;
        //  if (errorMessage && errorMessage[0]) {
        //    toast.error(errorMessage[0]);
        //  } else {
        //    toast.error("Failed to post! Please try again later.");
        //  }
      },
      onSettled: () => {
        void ctx.tab.getTabById.invalidate();
      },
    });

  const {
    originalTabData,
    id,
    createdById,
    createdAt,
    updatedAt,
    title,
    setTitle,
    description,
    setDescription,
    genreId,
    setGenreId,
    tuning,
    chords,
    strummingPatterns,
    tabData,
    sectionProgression,
    bpm,
    setBpm,
    timeSignature,
    setTimeSignature,
    numberOfLikes,
    capo,
    setCapo,
    recordedAudioUrl,
    editing,
    setEditing,
    setOriginalTabData,
  } = useTabStore(
    (state) => ({
      originalTabData: state.originalTabData,
      id: state.id,
      createdById: state.createdById,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      title: state.title,
      setTitle: state.setTitle,
      description: state.description,
      setDescription: state.setDescription,
      genreId: state.genreId,
      setGenreId: state.setGenreId,
      tuning: state.tuning,
      bpm: state.bpm,
      setBpm: state.setBpm,
      chords: state.chords,
      strummingPatterns: state.strummingPatterns,
      tabData: state.tabData,
      sectionProgression: state.sectionProgression,
      timeSignature: state.timeSignature,
      setTimeSignature: state.setTimeSignature,
      capo: state.capo,
      setCapo: state.setCapo,
      recordedAudioUrl: state.recordedAudioUrl,
      editing: state.editing,
      numberOfLikes: state.numberOfLikes,
      setEditing: state.setEditing,
      setOriginalTabData: state.setOriginalTabData,
    }),
    shallow
  );

  // current user
  const {
    data: currentArtist,
    isLoading: loadingCurrentArtist,
    refetch: refetchCurrentArtist,
  } = api.artist.getByIdOrUsername.useQuery(
    {
      userId: userId ?? "",
    },
    {
      enabled: !!userId,
    }
  );

  // owner of tab
  const { data: tabCreator, refetch: refetchTabCreator } =
    api.artist.getByIdOrUsername.useQuery(
      {
        userId: createdById,
      },
      {
        enabled: !!createdById,
      }
    );

  function handleGenreChange(stringifiedId: string) {
    const id = parseInt(stringifiedId);
    if (isNaN(id)) return;

    setGenreId(id);
  }

  function handleBpmChange(event: ChangeEvent<HTMLInputElement>) {
    const inputValue = event.target.value;

    // Check if the input value is empty (backspace case) or a number between 1 and 400
    if (
      inputValue === "" ||
      (Number(inputValue) >= 1 && Number(inputValue) <= 400)
    ) {
      setBpm(Number(inputValue) === 0 ? -1 : Number(inputValue));
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
      setCapo(Number(inputValue) === 0 ? -1 : Number(inputValue));
      return;
    }

    // Check if the input value is a number between 1 and 12
    const num = Number(inputValue);

    if (!isNaN(num) && num >= 0 && num <= 12) {
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
    if (
      !title ||
      !genreId ||
      !tuning ||
      !bpm ||
      tabIsEffectivelyEmpty(tabData)
    ) {
      setShowPulsingError(true);
      setShowPublishCriteriaPopover(true);
      setTimeout(() => setShowPulsingError(false), 500);

      return;
    }

    // update in prisma
    if (userId) {
      createOrUpdate({
        id,
        createdById: userId,
        title,
        description,
        genreId,
        chords,
        strummingPatterns,
        tabData,
        sectionProgression,
        tuning,
        bpm,
        timeSignature,
        capo,
        type: asPath.includes("create") ? "create" : "update",
      });
    }
  }

  function isEqualToOriginalTabState() {
    if (!originalTabData) return false; // need to make sure this is always populated when editing..

    const originalData = {
      id: originalTabData.id,
      title: originalTabData.title,
      description: originalTabData.description,
      genreId: originalTabData.genreId,
      tabData: originalTabData.tabData,
      tuning: originalTabData.tuning,
      bpm: originalTabData.bpm,
      sectionProgression: originalTabData.sectionProgression,
      timeSignature: originalTabData.timeSignature,
      capo: originalTabData.capo,
      createdById: originalTabData.createdById,
      recordedAudioUrl: originalTabData.recordedAudioUrl,
      chords: originalTabData.chords,
      strummingPatterns: originalTabData.strummingPatterns,
    };

    const sanitizedCurrentTabData = {
      id,
      title,
      description,
      genreId,
      tabData,
      tuning,
      bpm,
      sectionProgression,
      timeSignature,
      capo,
      createdById,
      recordedAudioUrl,
      chords,
      strummingPatterns,
    };

    return isEqual(originalData, sanitizedCurrentTabData);
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

  return (
    <>
      {editing && (
        <div className="baseVertFlex w-full gap-2">
          <div className="baseFlex w-full !items-start !justify-between p-4 md:!items-center">
            <div className="baseFlex">
              {!asPath.includes("create") && (
                <Button
                  className="px-1 py-0 md:px-4 md:py-2"
                  onClick={() => void push(`/tab/${id}`)}
                >
                  {overMediumViewportThreshold ? (
                    "Return to tab"
                  ) : (
                    <BsArrowRightShort className="h-6 w-8 rotate-180 text-pink-50" />
                  )}
                </Button>
              )}
            </div>

            <div className="baseFlex !flex-col-reverse !items-end gap-2 md:!flex-row md:!items-center">
              <>
                {!asPath.includes("create") && (
                  <Button
                    variant={"destructive"}
                    onClick={() => {
                      // bring up modal to confirm deletion
                      // delete tab and redirect to wherever user came from before editing
                    }}
                    className="baseFlex gap-2"
                  >
                    Delete
                    <FaTrashAlt className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant={"recording"}
                  onClick={() => {
                    // bring up modal to record/edit/delete tab recording
                  }}
                >
                  <div className="baseFlex gap-2">
                    {recordedAudioUrl ? "Edit recording" : "Record tab"}
                    <FaMicrophoneAlt className="h-5 w-5" />
                  </div>
                </Button>

                <Button
                  variant={"secondary"}
                  disabled={showPulsingError}
                  onClick={handlePreview}
                  className="baseFlex gap-2"
                >
                  Preview
                  <AiFillEye className="h-5 w-5" />
                </Button>

                <Popover
                  open={showPublishCriteriaPopover}
                  onOpenChange={(open) => {
                    if (open === false) {
                      setShowPublishCriteriaPopover(false);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      // eventually add loading spinner here while saving
                      disabled={isEqualToOriginalTabState() || showPulsingError}
                      onClick={handleSave}
                      className="baseFlex gap-2"
                    >
                      {asPath.includes("create")
                        ? `${isPosting ? "Publishing" : "Publish"}`
                        : `${isPosting ? "Saving" : "Save"}`}

                      <AnimatePresence mode="wait">
                        {/* will need to also include condition for while recording is being
                            uploaded to s3 to also show loading spinner, don't necessarily have to
                            communicate that it's uploading recorded audio imo */}
                        {isPosting && (
                          <motion.svg
                            key="postingLoadingSpinner"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: 0.15,
                            }}
                            className="h-6 w-6 animate-spin rounded-full bg-inherit fill-none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="baseVertFlex !items-start gap-2 bg-pink-50 p-2 text-pink-950">
                    <div className="baseFlex gap-2">
                      {title ? (
                        <Check className="h-5 w-8 text-green-600" />
                      ) : (
                        <BsPlus className="h-8 w-8 rotate-45 text-red-600" />
                      )}
                      <p className="font-semibold">Title entered</p>
                    </div>

                    <div className="baseFlex gap-2">
                      {genreId !== -1 ? (
                        <Check className="h-5 w-8 text-green-600" />
                      ) : (
                        <BsPlus className="h-8 w-8 rotate-45 text-red-600" />
                      )}
                      <p className="font-semibold">Genre selected</p>
                    </div>

                    <div className="baseFlex gap-2">
                      {!tabIsEffectivelyEmpty(tabData) ? (
                        <Check className="h-5 w-8 text-green-600" />
                      ) : (
                        <BsPlus className="h-8 w-8 rotate-45 text-red-600" />
                      )}
                      <p className="font-semibold">
                        At least one note present in tab
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            </div>
          </div>
          <div className={classes.editingMetadataContainer}>
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
                placeholder="Add any extra information about how to play this tab."
                maxLength={500}
                value={description ?? ""}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // technically allows a *ton* of newlines, messing up ui, but not mission critical
                    setDescription(description + "\n");
                  }
                }}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
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
                value={capo === -1 ? "" : capo}
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
                value={bpm === -1 ? "" : bpm}
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
        </div>
      )}

      {!editing && (
        <div className="min-h-[100px] w-full">
          <div
            className={`${
              classes.headerInfo ?? ""
            } w-full rounded-t-md bg-pink-700 shadow-md`}
          >
            <div className="baseVertFlex w-full !justify-end gap-2 md:!flex-row md:!justify-between md:gap-0">
              <div className="baseVertFlex gap-4 md:!flex-row md:gap-2">
                <div className="baseFlex !justify-between gap-2 md:!justify-center">
                  <div className="text-2xl font-bold">{title}</div>

                  <LikeAndUnlikeButton
                    customClassName="baseFlex !hidden gap-2 px-2 py-0 md:!flex md:p-2"
                    createdById={createdById}
                    id={id}
                    numberOfLikes={numberOfLikes}
                    tabCreator={tabCreator}
                    currentArtist={currentArtist}
                    // fix typing/linting errors later
                    refetchCurrentArtist={refetchCurrentArtist}
                    // fix typing/linting errors later
                    refetchTabCreator={refetchTabCreator}
                    refetchTab={refetchTab}
                  />
                </div>

                <Separator
                  orientation="vertical"
                  className="hidden h-8 md:block"
                />

                <div className="baseVertFlex gap-2 md:!flex-row">
                  <Button
                    disabled={!tabCreator}
                    variant={"ghost"}
                    className="px-3 py-1"
                  >
                    <Link
                      href={`/artist/${tabCreator?.username ?? ""}`}
                      className="baseFlex gap-2"
                    >
                      <div className="grid grid-cols-1 grid-rows-1">
                        {tabCreator || loadingCurrentArtist ? (
                          <>
                            <Image
                              src={tabCreator?.profileImageUrl ?? ""}
                              alt={`${
                                tabCreator?.username ?? "Anonymous"
                              }'s profile image`}
                              width={32}
                              height={32}
                              // TODO: maybe just a developemnt thing, but it still very
                              // briefly shows the default placeholder for a loading
                              // or not found image before the actual image loads...
                              onLoadingComplete={() =>
                                setProfileImageLoaded(true)
                              }
                              style={{
                                opacity: profileImageLoaded ? 1 : 0,
                              }}
                              className="col-start-1 col-end-2 row-start-1 row-end-2 h-8 w-8 rounded-full bg-pink-800 object-cover object-center 
                          transition-opacity"
                            />
                            <div
                              style={{
                                opacity: !profileImageLoaded ? 1 : 0,
                              }}
                              className={`col-start-1 col-end-2 row-start-1 row-end-2 h-8 w-8 rounded-full bg-pink-300 transition-opacity
                              ${!profileImageLoaded ? "animate-pulse" : ""}
                            `}
                            ></div>
                          </>
                        ) : (
                          <AiOutlineUser className="h-8 w-8" />
                        )}
                      </div>

                      <span className="text-lg">
                        {tabCreator?.username ?? "Anonymous"}
                      </span>
                    </Link>
                  </Button>
                  <Separator className="hidden h-[1px] w-4 md:block" />
                  <p className="ml-2">
                    {updatedAt && updatedAt.getTime() !== createdAt?.getTime()
                      ? `Updated on ${formatDate(updatedAt)}`
                      : `Created on ${formatDate(createdAt ?? new Date())}`}
                  </p>
                </div>
              </div>

              {/* if you still wanted to add "forking" functionality, then that would go here */}

              <div className="baseFlex w-full !justify-end gap-2 md:w-auto md:!justify-center">
                <LikeAndUnlikeButton
                  customClassName="baseFlex gap-2 px-2 py-0 md:hidden md:p-2"
                  createdById={createdById}
                  id={id}
                  numberOfLikes={numberOfLikes}
                  tabCreator={tabCreator}
                  currentArtist={currentArtist}
                  // fix typing/linting errors later
                  refetchCurrentArtist={refetchCurrentArtist}
                  // fix typing/linting errors later
                  refetchTabCreator={refetchTabCreator}
                  refetchTab={refetchTab}
                />

                {((userId && createdById === userId) ||
                  asPath.includes("create")) && (
                  <Button
                    onClick={() => {
                      if (asPath.includes("create") || asPath.includes("edit"))
                        setEditing(true);
                      else void push(`/tab/${id}/edit`);
                    }}
                  >
                    {asPath.includes("edit") || asPath.includes("create")
                      ? "Continue editing"
                      : "Edit"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className={classes.metadataContainer}>
            <div
              className={`${
                classes.description ?? ""
              } baseVertFlex w-full !items-start gap-2`}
            >
              <div className="font-semibold">Description</div>

              <div className="baseVertFlex !items-start gap-2">
                {description.split("\n").map((paragraph, index) => (
                  <p key={index} className="break-all">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <div className="baseVertFlex w-full gap-4 md:flex-row md:items-start md:gap-8">
              <div className="baseFlex w-full !items-start !justify-evenly gap-4 md:w-auto md:flex-row md:gap-8">
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
                    } baseFlex w-[150px] !justify-between gap-2 rounded-md px-4 py-[0.39rem]`}
                  >
                    {genreObject[genreId]?.name}
                    <GenrePreviewBubbles
                      color={genreObject[genreId]?.color ?? "#FFFFFF"}
                    />
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

                {/* feels a bit weird with "none" option, but felt weird leaving so
                    much extra space */}
                <div
                  className={`${
                    classes.capo ?? ""
                  } baseVertFlex !items-start gap-2`}
                >
                  <p className="font-semibold">Capo</p>
                  <p>
                    {capo === 0 ? "None" : `${getOrdinalSuffix(capo)} fret`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TabMetadata;
