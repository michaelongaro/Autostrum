import { useAuth } from "@clerk/nextjs";
import { type Genre } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import isEqual from "lodash.isequal";
import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState, type ChangeEvent } from "react";
import { AiFillEye, AiOutlineUser } from "react-icons/ai";
import { BsArrowRightShort, BsPlus } from "react-icons/bs";
import { FaMicrophoneAlt, FaTrashAlt } from "react-icons/fa";
import { shallow } from "zustand/shallow";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import useSound from "~/hooks/useSound";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import { api } from "~/utils/api";
import formatDate from "~/utils/formatDate";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";
import { parse, toString } from "~/utils/tunings";
import { CommandCombobox } from "../ui/CommandCombobox";
import LikeAndUnlikeButton from "../ui/LikeAndUnlikeButton";
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
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import type { RefetchTab } from "./Tab";
import classes from "./TabMetadata.module.css";

function TabMetadata({ refetchTab }: Partial<RefetchTab>) {
  const { userId } = useAuth();

  const { push, asPath } = useRouter();
  const ctx = api.useContext();

  const [showDeletePopover, setShowDeletePopover] = useState(false);
  const [showPublishCriteriaPopover, setShowPublishCriteriaPopover] =
    useState(false);
  const [
    showUnregisteredRecordingPopover,
    setShowUnregisteredRecordingPopover,
  ] = useState(false);
  const [unregisteredPopoverTimeoutId, setUnregisteredPopoverTimeoutId] =
    useState<NodeJS.Timeout | null>(null);

  const [showPulsingError, setShowPulsingError] = useState(false);
  const [profileImageLoaded, setProfileImageLoaded] = useState(false);
  const [showDeleteCheckmark, setShowDeleteCheckmark] = useState(false);
  const [showPublishCheckmark, setShowPublishCheckmark] = useState(false);

  const overMediumViewportThreshold = useViewportWidthBreakpoint(768);

  const genreArray = api.genre.getAll.useQuery();

  const genreObject: Record<number, Genre> = useMemo(() => {
    if (!genreArray.data) return {};

    return genreArray.data.reduce((acc: Record<number, Genre>, genre) => {
      acc[genre.id] = genre;
      return acc;
    }, {});
  }, [genreArray.data]);

  const { mutate: createOrUpdate, isLoading: isPosting } =
    api.tab.createOrUpdate.useMutation({
      onSuccess: (tab) => {
        if (tab) {
          setShowPublishCheckmark(true);

          setTimeout(() => {
            if (asPath.includes("create")) {
              void push(`/tab/${tab.id}`);
            }

            setOriginalTabData(tab);
          }, 500);
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

  const { mutate: deleteTab, isLoading: isDeleting } =
    api.tab.deleteTabById.useMutation({
      onSuccess: () => {
        setShowDeleteCheckmark(true);

        setTimeout(() => {
          void push(`/create`);
        }, 500);
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
    musicalKey,
    setMusicalKey,
    numberOfLikes,
    capo,
    setCapo,
    hasRecordedAudio,
    editing,
    setEditing,
    setOriginalTabData,
    setShowAudioRecorderModal,
    recordedAudioFile,
    shouldUpdateInS3,
    audioMetadata,
    previewMetadata,
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
      musicalKey: state.musicalKey,
      setMusicalKey: state.setMusicalKey,
      capo: state.capo,
      setCapo: state.setCapo,
      hasRecordedAudio: state.hasRecordedAudio,
      editing: state.editing,
      numberOfLikes: state.numberOfLikes,
      setEditing: state.setEditing,
      setOriginalTabData: state.setOriginalTabData,
      setShowAudioRecorderModal: state.setShowAudioRecorderModal,
      recordedAudioFile: state.recordedAudioFile,
      shouldUpdateInS3: state.shouldUpdateInS3,
      audioMetadata: state.audioMetadata,
      previewMetadata: state.previewMetadata,
    }),
    shallow
  );

  const { pauseAudio } = useSound();

  // current user
  const { data: currentArtist, refetch: refetchCurrentArtist } =
    api.artist.getByIdOrUsername.useQuery(
      {
        userId: userId as string,
      },
      {
        enabled: !!userId,
      }
    );

  // owner of tab
  const {
    data: tabCreator,
    isFetching: fetchingTabCreator,
    refetch: refetchTabCreator,
  } = api.artist.getByIdOrUsername.useQuery(
    {
      userId: createdById as string,
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

    // Prevent '/' from being the first or only character
    if (newValue === "/" || newValue.endsWith("//")) return;

    // Only allow one '/'
    if (parts.length > 2) return;

    for (const part of parts) {
      if (part !== "") {
        // Disallow more than two digits in either part
        if (part.length > 2) return;

        const num = parseInt(part, 10);

        // Adjust validation to allow for ongoing inputs like '4/1'
        if (isNaN(num) || num < 1 || (part.length === 2 && num > 20)) return;
      }
    }

    // Check if newValue is purely numeric or contains a slash
    const regex = /^[0-9/]*$/;
    if (!regex.test(newValue)) return;

    setTimeSignature(newValue);
  }

  function handleMuscialKeyChange(e: ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;

    // Only allow valid musical key notations for guitar
    // E.g., "C", "C#", "Db", "A", "Am", "F#m", etc.
    const regex = /^(C|C#|Db|D|D#|Eb|E|F|F#|Gb|G|G#|Ab|A|A#|Bb|B)(m?)$/;
    if (regex.test(newValue) || newValue === "") {
      setMusicalKey(newValue);
    }
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

  async function handleSave() {
    if (
      !userId ||
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

    let base64RecordedAudioFile: string | null = null;

    if (recordedAudioFile) {
      base64RecordedAudioFile = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(recordedAudioFile);
        reader.onloadend = () => {
          // not sure if this is the best type-narrowing check for below resolve()
          if (!reader.result || typeof reader.result !== "string") return null;
          resolve(reader.result.split(",")[1]!);
        };
        reader.onerror = reject;
      })
        .then((base64) => {
          return base64 as string;
        })
        .catch((err) => {
          console.error(err);
          return null;
        });
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
        hasRecordedAudio,
        tuning,
        bpm,
        timeSignature,
        capo,
        base64RecordedAudioFile,
        shouldUpdateInS3,
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
      hasRecordedAudio: originalTabData.hasRecordedAudio,
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
      hasRecordedAudio,
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
                  <Popover
                    open={showDeletePopover}
                    onOpenChange={(open) => setShowDeletePopover(open)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant={"destructive"}
                        disabled={isDeleting}
                        className="baseFlex gap-2"
                      >
                        {isDeleting || showDeleteCheckmark
                          ? "Deleting"
                          : "Delete"}
                        <FaTrashAlt className="h-4 w-4" />
                        <AnimatePresence mode="wait">
                          {isDeleting && (
                            <motion.svg
                              key="tabDeletionLoadingSpinner"
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "24px" }}
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

                          {showDeleteCheckmark && (
                            <motion.div
                              key="deletionSuccessCheckmark"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                duration: 0.25,
                              }}
                            >
                              <Check className="h-5 w-5" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="baseVertFlex gap-4 bg-pink-50 p-2 text-sm text-pink-950 md:text-base">
                      <p className="w-auto text-center text-sm">
                        Are you sure you want to delete this tab?
                      </p>

                      <div className="baseFlex gap-2">
                        <Button
                          variant={"outline"}
                          size="sm"
                          onClick={() => setShowDeletePopover(false)}
                        >
                          Cancel
                        </Button>

                        <Button
                          variant={"destructive"}
                          size="sm"
                          disabled={isDeleting}
                          onClick={() => deleteTab(id)}
                          className="baseFlex gap-2"
                        >
                          Confirm
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                <Popover
                  open={showUnregisteredRecordingPopover}
                  onOpenChange={(open) => {
                    if (open === false) {
                      setShowUnregisteredRecordingPopover(false);
                      if (unregisteredPopoverTimeoutId) {
                        clearTimeout(unregisteredPopoverTimeoutId);
                        setUnregisteredPopoverTimeoutId(null);
                      }
                    }
                  }}
                >
                  <PopoverTrigger
                    asChild
                    onClick={() => {
                      if (!currentArtist) {
                        setShowUnregisteredRecordingPopover(true);
                        setUnregisteredPopoverTimeoutId(
                          setTimeout(() => {
                            setShowUnregisteredRecordingPopover(false);
                          }, 2000)
                        );
                      }
                    }}
                  >
                    <Button
                      variant={"recording"}
                      onClick={() => {
                        if (!userId) return;

                        setShowAudioRecorderModal(true);

                        if (audioMetadata.playing || previewMetadata.playing) {
                          pauseAudio();
                        }
                      }}
                    >
                      <div className="baseFlex gap-2">
                        {hasRecordedAudio ? "Edit recording" : "Record tab"}
                        <FaMicrophoneAlt className="h-4 w-4" />
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[325px] bg-pink-50 p-2 text-sm text-pink-950 md:w-[375px] md:text-base">
                    <div className="baseFlex !flex-nowrap gap-2 pr-2">
                      <BsPlus className="h-8 w-8 rotate-45 text-red-600" />
                      <p> Only registered users can record a tab.</p>
                    </div>
                  </PopoverContent>
                </Popover>

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
                      disabled={
                        isEqualToOriginalTabState() ||
                        showPulsingError ||
                        isPosting
                      }
                      onClick={() => void handleSave()}
                      className="baseFlex gap-2"
                    >
                      {asPath.includes("create")
                        ? `${
                            isPosting || showPublishCheckmark
                              ? "Publishing"
                              : "Publish"
                          }`
                        : `${
                            isPosting || showPublishCheckmark
                              ? "Saving"
                              : "Save"
                          }`}

                      <AnimatePresence mode="wait">
                        {/* will need to also include condition for while recording is being
                            uploaded to s3 to also show loading spinner, don't necessarily have to
                            communicate that it's uploading recorded audio imo */}
                        {isPosting && (
                          <motion.svg
                            key="postingLoadingSpinner"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "24px" }}
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
                        {showPublishCheckmark && (
                          <motion.div
                            key="postingSuccessCheckmark"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              duration: 0.25,
                            }}
                          >
                            <Check className="h-5 w-5" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    {userId ? (
                      <div className="baseVertFlex w-full !items-start gap-2 bg-pink-50 p-2 pr-4 text-sm text-pink-950 md:text-base">
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

                        <div className="baseFlex !flex-nowrap gap-2">
                          {!tabIsEffectivelyEmpty(tabData) ? (
                            <Check className="h-5 w-8 text-green-600" />
                          ) : (
                            <BsPlus className="h-8 w-8 rotate-45 text-red-600" />
                          )}
                          <p className="font-semibold">
                            At least one note present in tab
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="baseFlex w-full max-w-[350px] bg-pink-50 p-2 pt-1 text-sm text-pink-950 md:max-w-[400px] md:text-base">
                        <div className="baseFlex !flex-nowrap gap-2">
                          <BsPlus className="h-8 w-8 rotate-45 text-red-600" />
                          <p>Only registered users can publish a tab.</p>
                        </div>
                        <p className="text-xs md:text-sm">
                          This tab&apos;s data will be saved for you upon
                          signing in.
                        </p>
                      </div>
                    )}
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
                className="w-full animate-errorShake md:w-72"
                onChange={(e) => {
                  if (e.target.value.length > 30) return;
                  setTitle(e.target.value);
                }}
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
                inputMode="numeric"
                pattern="[0-9]*"
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
                inputMode="numeric"
                pattern="[0-9]*"
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

            <div
              className={`${
                classes.musicalKey ?? ""
              } baseVertFlex w-16 max-w-sm !items-start gap-1.5`}
            >
              <Label htmlFor="musicalKey">Key</Label>
              <Input
                type="text"
                placeholder="E"
                value={musicalKey ?? ""}
                onChange={handleMuscialKeyChange}
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
                        {tabCreator || fetchingTabCreator ? (
                          <>
                            <Image
                              src={tabCreator?.profileImageUrl ?? ""}
                              alt={`${
                                tabCreator?.username ?? "Anonymous"
                              }'s profile image`}
                              width={32}
                              height={32}
                              onLoadingComplete={() => {
                                setTimeout(() => {
                                  setProfileImageLoaded(true);
                                }, 1000);
                              }}
                              style={{
                                opacity: profileImageLoaded ? 1 : 0,
                              }}
                              className="col-start-1 col-end-2 row-start-1 row-end-2 h-8 w-8 rounded-full object-cover object-center transition-opacity"
                            />
                            <div
                              style={{
                                opacity: !profileImageLoaded ? 1 : 0,
                                zIndex: !profileImageLoaded ? 1 : -1,
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

                      <span
                        className={`text-lg ${
                          !tabCreator && !fetchingTabCreator ? "italic" : ""
                        }`}
                      >
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
                {description.length > 0 ? (
                  description.split("\n").map((paragraph, index) => (
                    <p key={index} className="break-all">
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="italic text-pink-200">
                    No description provided.
                  </p>
                )}
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
                    <Image
                      src={`/genrePreviewBubbles/id${genreId}.png`}
                      alt="three genre preview bubbles with the same color as the associated genre"
                      width={32}
                      height={32}
                      quality={100}
                      unoptimized
                      style={{
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    />
                  </div>
                </div>
                <div
                  className={`${
                    classes.tuning ?? ""
                  } baseVertFlex !items-start gap-2`}
                >
                  <div className="font-semibold">Tuning</div>
                  <div className="rounded-md border-2 border-pink-50 px-4 py-2 font-semibold ">
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

                {musicalKey && (
                  <div
                    className={`${
                      classes.musicalKey ?? ""
                    } baseVertFlex !items-start gap-2`}
                  >
                    <div className="font-semibold">Key</div>
                    <div>{musicalKey}</div>
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
