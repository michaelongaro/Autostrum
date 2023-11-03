import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import isEqual from "lodash.isequal";
import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { AiFillEye, AiOutlineUser } from "react-icons/ai";
import { BsArrowRightShort, BsPlus } from "react-icons/bs";
import { FaMicrophoneAlt, FaTrashAlt } from "react-icons/fa";
import { MdModeEditOutline } from "react-icons/md";
import { shallow } from "zustand/shallow";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore, type Section } from "~/stores/TabStore";
import { api } from "~/utils/api";
import formatDate from "~/utils/formatDate";
import { genreList } from "~/utils/genreList";
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
import TabPreview from "./TabPreview";

type TabMetadata = {
  customTuning: string;
} & Partial<RefetchTab>;

function TabMetadata({ refetchTab, customTuning }: TabMetadata) {
  const { userId } = useAuth();

  const { push, asPath } = useRouter();
  const ctx = api.useContext();

  const [minifiedTabData, setMinifiedTabData] = useState<Section[]>();
  const [takingScreenshot, setTakingScreenshot] = useState(false);
  const tabPreviewScreenshotRef = useRef(null);

  const [showDeletePopover, setShowDeletePopover] = useState(false);
  const [showPublishPopover, setShowPublishPopover] = useState(false);
  const [
    showUnregisteredRecordingPopover,
    setShowUnregisteredRecordingPopover,
  ] = useState(false);
  const [unregisteredPopoverTimeoutId, setUnregisteredPopoverTimeoutId] =
    useState<NodeJS.Timeout | null>(null);

  const [publishErrorOccurred, setPublishErrorOccurred] = useState(false);
  const [showPulsingError, setShowPulsingError] = useState(false);
  const [profileImageLoaded, setProfileImageLoaded] = useState(false);
  const [showDeleteCheckmark, setShowDeleteCheckmark] = useState(false);
  const [showPublishCheckmark, setShowPublishCheckmark] = useState(false);

  const overMediumViewportThreshold = useViewportWidthBreakpoint(768);

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
          }, 250);

          setTimeout(() => {
            setShowPublishCheckmark(false);
          }, 1500);
        }
      },
      onError: (e) => {
        setPublishErrorOccurred(true);
        setShowPublishPopover(true);
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
        }, 250);

        setTimeout(() => {
          setShowDeleteCheckmark(false);
        }, 1500);
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
    pauseAudio,
    isLoadingARoute,
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
      pauseAudio: state.pauseAudio,
      isLoadingARoute: state.isLoadingARoute,
    }),
    shallow
  );

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

    // Check if the input value is empty (backspace case) or a number between 1 and 500
    if (
      inputValue === "" ||
      (Number(inputValue) >= 1 && Number(inputValue) <= 500)
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
    if (
      !title ||
      !tuning ||
      genreId === -1 ||
      bpm === -1 ||
      tabIsEffectivelyEmpty(tabData)
    ) {
      setShowPulsingError(true);
      setTimeout(() => setShowPulsingError(false), 500);

      return;
    }

    setEditing(false);
  }

  function getMinifiedTabData() {
    const modifiedTabData: Section[] = [];

    // gets first two subsections from first section
    if (tabData[0]!.data.length > 1) {
      modifiedTabData.push({
        ...tabData[0]!,
        data: tabData[0]!.data.slice(0, 2),
      });
    }
    // combined first subsection from first two sections
    else if (tabData.length > 1) {
      modifiedTabData.push(
        {
          ...tabData[0]!,
          data: [...tabData[0]!.data],
        },
        {
          ...tabData[1]!,
          data: [...tabData[1]!.data.slice(0, 1)],
        }
      );
    }
    // only has one section w/ one subsection within, and uses that
    else {
      modifiedTabData.push({
        ...tabData[0]!,
        data: [...tabData[0]!.data],
      });
    }

    return modifiedTabData;
  }

  async function handleSave() {
    if (
      !userId ||
      !title ||
      !tuning ||
      genreId === -1 ||
      bpm === -1 ||
      tabIsEffectivelyEmpty(tabData)
    ) {
      setShowPulsingError(true);
      setShowPublishPopover(true);
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

    setMinifiedTabData(getMinifiedTabData());
    setTakingScreenshot(true);

    setTimeout(() => {
      void html2canvas(tabPreviewScreenshotRef.current!).then((canvas) => {
        const base64Screenshot = canvas.toDataURL("image/jpeg", 0.75);
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
            musicalKey,
            base64TabScreenshot: base64Screenshot,
            type: asPath.includes("create") ? "create" : "update",
          });
        }

        setMinifiedTabData(undefined);
        setTakingScreenshot(false);
      });
    }, 1000); // trying to give ample time for state to update and <TabPreview /> to completely render
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
      musicalKey: originalTabData.musicalKey,
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
      musicalKey,
    };

    return isEqual(originalData, sanitizedCurrentTabData) && !shouldUpdateInS3;
  }

  function renderSavePopoverContent() {
    if (publishErrorOccurred) {
      return (
        <div className="baseVertFlex w-full !items-start gap-2 bg-pink-50 p-2 text-sm text-pink-950 md:text-base">
          <div className="baseFlex gap-2">
            <BsPlus className="h-8 w-8 rotate-45 text-red-600" />
            <p>Failed to publish tab. Please try again later.</p>
          </div>
        </div>
      );
    }

    if (userId) {
      return (
        <div className="baseVertFlex w-full !items-start gap-2 bg-pink-50 p-2 pr-4 text-sm text-pink-950 md:text-base">
          <div className="baseFlex gap-2">
            {title ? (
              <Check className="h-5 w-8 text-green-600" />
            ) : (
              <BsPlus className="mb-[-3px] h-7 w-8 rotate-45 p-0 text-red-600" />
            )}
            <p>{`Title is ${title ? "present" : "missing"}`}</p>
          </div>

          <div className="baseFlex gap-2">
            {genreId !== -1 ? (
              <Check className="h-5 w-8 text-green-600" />
            ) : (
              <BsPlus className="mb-[-3px] h-7 w-8 rotate-45 text-red-600" />
            )}
            <p>{`Genre has ${genreId === -1 ? "not" : ""} been selected`}</p>
          </div>

          <div className="baseFlex gap-2">
            {bpm !== -1 ? (
              <Check className="h-5 w-8 text-green-600" />
            ) : (
              <BsPlus className="mb-[-3px] h-7 w-8 rotate-45 text-red-600" />
            )}
            <p>{`BPM is ${bpm === -1 ? "not" : ""} defined`}</p>
          </div>

          {!tabIsEffectivelyEmpty(tabData) ? (
            <div className="baseFlex !flex-nowrap gap-2">
              <Check className="h-5 w-8 text-green-600" />
              <p>Tab isn&apos;t empty</p>
            </div>
          ) : (
            <div className="baseFlex !flex-nowrap gap-2">
              <BsPlus className="mb-[-3px] h-7 w-8 rotate-45 text-red-600" />
              <p>Tab is empty</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="baseFlex w-full max-w-[350px] bg-pink-50 p-2 pt-1 text-sm text-pink-950 md:max-w-[400px] md:text-base">
        <div className="baseFlex !flex-nowrap gap-2">
          <BsPlus className="h-8 w-8 rotate-45 text-red-600" />
          <p>Only registered users can publish a tab.</p>
        </div>
        <p className="text-xs md:text-sm">
          This tab&apos;s data will be saved for you upon signing in.
        </p>
      </div>
    );
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
                  disabled={isLoadingARoute}
                  className="baseFlex py-1 pl-1 pr-3 md:py-2"
                  onClick={() => void push(`/tab/${id}`)}
                >
                  <BsArrowRightShort className="h-6 w-8 rotate-180 text-pink-50" />
                  Return to tab
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
                        disabled={
                          isDeleting || showDeleteCheckmark || isLoadingARoute
                        }
                        className="baseFlex gap-2"
                      >
                        {showDeleteCheckmark && !isDeleting
                          ? "Deleted"
                          : isDeleting
                          ? "Deleting"
                          : "Delete"}
                        <FaTrashAlt className="h-4 w-4" />
                        <AnimatePresence mode="wait">
                          {isDeleting && (
                            <motion.svg
                              key="tabDeletionLoadingSpinner"
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "24px" }}
                              exit={{ opacity: 0 }}
                              transition={{
                                duration: 0.15,
                              }}
                              className="h-6 w-6 animate-stableSpin rounded-full bg-inherit fill-none"
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
                              initial={{ opacity: 0, width: "20px" }}
                              animate={{ opacity: 1, width: "20px" }}
                              exit={{ opacity: 0, width: 0 }}
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
                          onClick={() => {
                            deleteTab(id);
                            setShowDeletePopover(false);
                          }}
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
                  open={showPublishPopover}
                  onOpenChange={(open) => {
                    if (open === false) {
                      setShowPublishPopover(false);

                      if (publishErrorOccurred) {
                        setPublishErrorOccurred(false);
                      }
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      disabled={
                        audioMetadata.playing || // helps with performance when playing audio (while editing)
                        isLoadingARoute ||
                        isEqualToOriginalTabState() ||
                        showPulsingError ||
                        isPosting ||
                        showPublishCheckmark ||
                        takingScreenshot
                      }
                      onClick={() => void handleSave()}
                      className="baseFlex gap-2"
                    >
                      {asPath.includes("create")
                        ? `${
                            showPublishCheckmark &&
                            !isPosting &&
                            !takingScreenshot
                              ? "Published"
                              : isPosting || takingScreenshot
                              ? "Publishing"
                              : "Publish"
                          }`
                        : `${
                            showPublishCheckmark &&
                            !isPosting &&
                            !takingScreenshot
                              ? "Saved"
                              : isPosting || takingScreenshot
                              ? "Saving"
                              : "Save"
                          }`}

                      <AnimatePresence mode="wait">
                        {/* will need to also include condition for while recording is being
                            uploaded to s3 to also show loading spinner, don't necessarily have to
                            communicate that it's uploading recorded audio imo */}
                        {(isPosting || takingScreenshot) && (
                          <motion.svg
                            key="postingLoadingSpinner"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "24px" }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: 0.15,
                            }}
                            className="h-6 w-6 animate-stableSpin rounded-full bg-inherit fill-none"
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
                            initial={{ opacity: 0, width: "20px" }}
                            animate={{ opacity: 1, width: "20px" }}
                            exit={{ opacity: 0, width: 0 }}
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
                    {renderSavePopoverContent()}
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
                showingErrorShakeAnimation={showPulsingError && !title}
                className="w-full md:w-72"
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
                autoComplete="off"
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
                value={genreList[genreId]?.id.toString()}
                onValueChange={(value) => handleGenreChange(value)}
              >
                <SelectTrigger
                  style={{
                    boxShadow:
                      showPulsingError && genreId === -1
                        ? "0 0 0 0.25rem hsl(0deg 100% 50%)"
                        : "0 0 0 0 transparent",
                    transitionProperty: "box-shadow",
                    transitionTimingFunction: "ease-in-out",
                    transitionDuration: "500ms",
                  }}
                  className={`w-[180px] ${
                    showPulsingError && genreId === -1
                      ? "animate-errorShake"
                      : ""
                  }`}
                >
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Genres</SelectLabel>

                    {Object.values(genreList)
                      .slice(0, Object.values(genreList).length - 1)
                      .map((genre) => {
                        return (
                          <SelectItem
                            key={genre.id}
                            value={genre.id.toString()}
                          >
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
              <CommandCombobox customTuning={customTuning} />
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
                showingErrorShakeAnimation={showPulsingError && bpm === -1}
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
            } w-full rounded-t-md bg-pink-700 !px-4 shadow-md md:!px-6`}
          >
            {overMediumViewportThreshold ? (
              <div className="baseFlex w-full !justify-between">
                <div className="baseFlex gap-2">
                  <div className="baseFlex gap-2">
                    <div className="text-2xl font-bold">{title}</div>

                    <LikeAndUnlikeButton
                      customClassName="baseFlex gap-2 p-2"
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

                  <Separator orientation="vertical" className="h-8" />

                  <div className="baseFlex gap-2">
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
                              {tabCreator && (
                                <Image
                                  src={tabCreator.profileImageUrl}
                                  alt={`${
                                    tabCreator?.username ?? "Anonymous"
                                  }'s profile image`}
                                  width={75}
                                  height={75}
                                  quality={100}
                                  onLoadingComplete={() => {
                                    setProfileImageLoaded(true);
                                  }}
                                  style={{
                                    opacity: profileImageLoaded ? 1 : 0,
                                    height: "2rem",
                                    width: "2rem",
                                  }}
                                  className="col-start-1 col-end-2 row-start-1 row-end-2 h-8 w-8 rounded-full object-cover object-center transition-opacity"
                                />
                              )}
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
                            <div className="baseFlex h-8 w-8 rounded-full border-[1px] shadow-md">
                              <AiOutlineUser className="h-5 w-5" />
                            </div>
                          )}
                        </div>

                        {tabCreator || fetchingTabCreator ? (
                          <div className="grid grid-cols-1 grid-rows-1">
                            <>
                              {tabCreator ? (
                                <span className="col-start-1 col-end-2 row-start-1 row-end-2 max-w-[100%] truncate ">
                                  {tabCreator.username}
                                </span>
                              ) : (
                                <div className="col-start-1 col-end-2 row-start-1 row-end-2 h-5 w-20 animate-pulse rounded-md bg-pink-300 "></div>
                              )}
                            </>
                          </div>
                        ) : (
                          <span className="italic text-pink-50">Anonymous</span>
                        )}
                      </Link>
                    </Button>

                    <Separator className="h-[1px] w-4" />

                    <p className="ml-2 text-pink-200">
                      {updatedAt && updatedAt.getTime() !== createdAt?.getTime()
                        ? `Updated on ${formatDate(updatedAt)}`
                        : `Created on ${formatDate(createdAt ?? new Date())}`}
                    </p>
                  </div>
                </div>

                {/* if you still wanted to add "forking" functionality, then that would go here */}

                {((userId && createdById === userId) ||
                  asPath.includes("create")) && (
                  <Button
                    disabled={isLoadingARoute}
                    className="baseFlex gap-2"
                    onClick={() => {
                      if (asPath.includes("create") || asPath.includes("edit"))
                        setEditing(true);
                      else void push(`/tab/${id}/edit`);
                    }}
                  >
                    {asPath.includes("edit") || asPath.includes("create")
                      ? "Continue editing"
                      : "Edit"}
                    <MdModeEditOutline className="h-5 w-5" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="baseVertFlex relative w-full !items-start gap-2">
                <div className="baseVertFlex !items-start gap-4">
                  <div className="text-2xl font-bold">{title}</div>

                  <div className="baseVertFlex !items-start gap-2">
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
                              {tabCreator && (
                                <Image
                                  src={tabCreator?.profileImageUrl ?? ""}
                                  alt={`${
                                    tabCreator?.username ?? "Anonymous"
                                  }'s profile image`}
                                  width={75}
                                  height={75}
                                  quality={100}
                                  onLoadingComplete={() => {
                                    setProfileImageLoaded(true);
                                  }}
                                  style={{
                                    opacity: profileImageLoaded ? 1 : 0,
                                    height: "2rem",
                                    width: "2rem",
                                  }}
                                  className="col-start-1 col-end-2 row-start-1 row-end-2 h-8 w-8 rounded-full object-cover object-center transition-opacity"
                                />
                              )}
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
                            <div className="baseFlex h-8 w-8 rounded-full border-[1px] shadow-md">
                              <AiOutlineUser className="h-5 w-5" />
                            </div>
                          )}
                        </div>

                        {tabCreator || fetchingTabCreator ? (
                          <div className="grid grid-cols-1 grid-rows-1">
                            <>
                              {tabCreator ? (
                                <span className="col-start-1 col-end-2 row-start-1 row-end-2 max-w-[100%] truncate ">
                                  {tabCreator.username}
                                </span>
                              ) : (
                                <div className="col-start-1 col-end-2 row-start-1 row-end-2 h-5 w-20 animate-pulse rounded-md bg-pink-300 "></div>
                              )}
                            </>
                          </div>
                        ) : (
                          <span className="italic text-pink-200">
                            Anonymous
                          </span>
                        )}
                      </Link>
                    </Button>

                    <p className="ml-2 text-sm text-pink-200">
                      {updatedAt && updatedAt.getTime() !== createdAt?.getTime()
                        ? `Updated on ${formatDate(updatedAt)}`
                        : `Created on ${formatDate(createdAt ?? new Date())}`}
                    </p>
                  </div>
                </div>

                {/* if you still wanted to add "forking" functionality, then that would go here */}

                <div
                  className={`baseFlex bottom-0 right-0 w-full !justify-end gap-2 ${
                    (userId && createdById === userId) ||
                    asPath.includes("create")
                      ? "relative mt-2"
                      : "absolute"
                  }`}
                >
                  <LikeAndUnlikeButton
                    customClassName="baseFlex gap-2 px-1 py-0 h-6"
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
                      disabled={isLoadingARoute}
                      className="baseFlex gap-2"
                      onClick={() => {
                        if (
                          asPath.includes("create") ||
                          asPath.includes("edit")
                        )
                          setEditing(true);
                        else void push(`/tab/${id}/edit`);
                      }}
                    >
                      {asPath.includes("edit") || asPath.includes("create")
                        ? "Continue editing"
                        : "Edit"}{" "}
                      <MdModeEditOutline className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={classes.metadataContainer}>
            <div
              className={`${
                classes.description ?? ""
              } baseVertFlex w-full !items-start gap-2 lg:w-[90%]`}
            >
              <div className="font-semibold">Description</div>

              <div className="baseVertFlex !items-start gap-2 text-sm md:text-base">
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
                  {genreList[genreId] && (
                    <div
                      style={{
                        backgroundColor: genreList[genreId]?.color,
                      }}
                      className={`${
                        classes.genre ?? ""
                      } baseFlex w-[140px] !justify-between gap-2 rounded-md px-4 py-[0.39rem]`}
                    >
                      {genreList[genreId]?.name}
                      <Image
                        src={`/genrePreviewBubbles/id${genreId}.png`}
                        alt="three genre preview bubbles with the same color as the associated genre"
                        width={32}
                        height={32}
                        quality={100}
                        style={{
                          pointerEvents: "none",
                          userSelect: "none",
                        }}
                      />
                    </div>
                  )}
                </div>
                <div
                  className={`${
                    classes.tuning ?? ""
                  } baseVertFlex !items-start gap-2`}
                >
                  <div className="font-semibold">Tuning</div>
                  <div className="rounded-md border-2 border-pink-50 px-2 py-2.5 text-sm font-semibold md:px-4 md:py-2 md:text-base">
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
                  <div>{bpm === -1 ? "" : bpm}</div>
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

      {minifiedTabData &&
        createPortal(
          <div className="h-full w-full overflow-hidden">
            <div
              ref={tabPreviewScreenshotRef}
              style={{
                background:
                  "linear-gradient(315deg, hsl(6, 100%, 63%), hsl(340, 100%, 76%), hsl(297, 100%, 87%)) fixed center / cover",
              }}
              className="baseFlex h-[581px] w-[1245px] scale-75" // technically scale isn't necessary but the background gradient was getting messed up without it...
            >
              <div className="h-[581px] w-[1245px] bg-pink-500 bg-opacity-20 ">
                <TabPreview
                  baselineBpm={bpm}
                  tuning={tuning}
                  tabData={minifiedTabData}
                  chords={chords}
                />
              </div>
            </div>
          </div>,
          document.getElementById("mainTabComponent")!
        )}
    </>
  );
}

export default TabMetadata;
