import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import isEqual from "lodash.isequal";
import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  useRef,
  useState,
  useEffect,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { AiFillEye } from "react-icons/ai";
import { BsArrowRightShort, BsPlus } from "react-icons/bs";
import { FaMicrophoneAlt, FaTrashAlt } from "react-icons/fa";
import { MdModeEditOutline, MdVerified } from "react-icons/md";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore, type Section } from "~/stores/TabStore";
import { api } from "~/utils/api";
import { genreList } from "~/utils/genreList";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";
import { tuningNotesToName } from "~/utils/tunings";
import ArtistCommandCombobox from "~/components/ui/ArtistCommandCombobox";
import TuningCommandCombobox from "../ui/TuningCommandCombobox";
import BookmarkToggle from "../ui/BookmarkToggle";
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
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import TabScreenshotPreview from "./TabScreenshotPreview";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import { QuarterNote } from "~/utils/bpmIconRenderingHelpers";
import RateTab from "~/components/ui/RateTab";
import DifficultyBars from "~/components/ui/DifficultyBars";
import { formatNumber } from "~/utils/formatNumber";

const KEYS_BY_LETTER = {
  A: ["A major", "A minor", "A# minor", "A♭ major", "A♭ minor"],
  B: ["B major", "B minor", "B♭ major", "B♭ minor"],
  C: ["C major", "C minor", "C# major", "C# minor", "C♭ major"],
  D: ["D major", "D minor", "D# minor", "D♭ major"],
  E: ["E major", "E minor", "E♭ major", "E♭ minor"],
  F: ["F major", "F minor", "F# major", "F# minor"],
  G: ["G major", "G minor", "G# minor", "G♭ major"],
};

const DIFFICULTIES = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert"];

type TabMetadata = {
  customTuning: string | null;
  setIsPostingOrSaving: Dispatch<SetStateAction<boolean>>;
};

function TabMetadata({ customTuning, setIsPostingOrSaving }: TabMetadata) {
  const { userId } = useAuth();

  const { push, asPath } = useRouter();
  const ctx = api.useUtils();

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
  const [showDeleteCheckmark, setShowDeleteCheckmark] = useState(false);
  const [showPublishCheckmark, setShowPublishCheckmark] = useState(false);

  const overMediumViewportThreshold = useViewportWidthBreakpoint(768);

  const {
    originalTabData,
    id,
    createdByUserId,
    createdAt,
    title,
    setTitle,
    artistId,
    setArtistId,
    artistName,
    setArtistName,
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
    key,
    setKey,
    difficulty,
    setDifficulty,
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
    setCurrentlyPlayingMetadata,
    setCurrentChordIndex,
  } = useTabStore((state) => ({
    originalTabData: state.originalTabData,
    id: state.id,
    createdByUserId: state.createdByUserId,
    createdAt: state.createdAt,
    title: state.title,
    setTitle: state.setTitle,
    artistId: state.artistId,
    setArtistId: state.setArtistId,
    artistName: state.artistName,
    setArtistName: state.setArtistName,
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
    capo: state.capo,
    setCapo: state.setCapo,
    hasRecordedAudio: state.hasRecordedAudio,
    editing: state.editing,
    key: state.key,
    setKey: state.setKey,
    difficulty: state.difficulty,
    setDifficulty: state.setDifficulty,
    setEditing: state.setEditing,
    setOriginalTabData: state.setOriginalTabData,
    setShowAudioRecorderModal: state.setShowAudioRecorderModal,
    recordedAudioFile: state.recordedAudioFile,
    shouldUpdateInS3: state.shouldUpdateInS3,
    audioMetadata: state.audioMetadata,
    previewMetadata: state.previewMetadata,
    pauseAudio: state.pauseAudio,
    isLoadingARoute: state.isLoadingARoute,
    setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
    setCurrentChordIndex: state.setCurrentChordIndex,
  }));

  const { data: dynamicMetadata, isLoading: isLoadingDynamicMetadata } =
    api.tab.getRatingBookmarkAndViewCountByTabId.useQuery(id, {
      enabled: !editing,
    });

  const { mutate: createOrUpdate, isLoading: isPosting } =
    api.tab.createOrUpdate.useMutation({
      onSuccess: (tab) => {
        if (tab) {
          setShowPublishCheckmark(true);
          setOriginalTabData(tab);

          setTimeout(() => {
            setCurrentlyPlayingMetadata(null);
            setCurrentChordIndex(0);
            if (asPath.includes("create")) {
              void push(`/tab/${tab.id}`);
            }
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

  useEffect(() => {
    setIsPostingOrSaving(isPosting);
  }, [isPosting, setIsPostingOrSaving]);

  // current user
  const { data: currentUser, refetch: refetchCurrentUser } =
    api.user.getByIdOrUsername.useQuery(
      {
        userId: userId!,
      },
      {
        enabled: !!userId,
      },
    );

  // owner of tab
  const {
    data: tabCreator,
    isFetching: fetchingTabCreator,
    refetch: refetchTabCreator,
  } = api.user.getByIdOrUsername.useQuery(
    {
      userId: createdByUserId!,
    },
    {
      enabled: !!createdByUserId,
    },
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

    pauseAudio(true);
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
        },
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

    // have to set this manually rather than relying on the effect since it takes
    // a bit for the posting to actually occur, this should be more synchronous
    setIsPostingOrSaving(true);

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
            createdByUserId: userId,
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
            capo,
            base64RecordedAudioFile,
            shouldUpdateInS3,
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
      artist: originalTabData.artistId,
      description: originalTabData.description,
      genreId: originalTabData.genreId,
      tabData: originalTabData.tabData,
      tuning: originalTabData.tuning,
      bpm: originalTabData.bpm,
      sectionProgression: originalTabData.sectionProgression,
      capo: originalTabData.capo,
      key: originalTabData.key,
      createdByUserId: originalTabData.createdByUserId,
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
      capo,
      key,
      createdByUserId,
      chords,
      strummingPatterns,
    };

    return isEqual(originalData, sanitizedCurrentTabData) && !shouldUpdateInS3;
  }

  function renderSavePopoverContent() {
    if (publishErrorOccurred) {
      return (
        <div className="baseVertFlex w-full !items-start gap-2 bg-pink-100 p-2 text-sm text-pink-950 md:text-base">
          <div className="baseFlex gap-2">
            <BsPlus className="h-8 w-8 rotate-45 text-red-600" />
            <p>Failed to publish tab. Please try again later.</p>
          </div>
        </div>
      );
    }

    if (userId) {
      return (
        <div className="baseVertFlex w-full !items-start gap-2 bg-pink-100 p-2 pr-4 text-sm text-pink-950 md:text-base">
          {title === "" && (
            <div className="baseFlex">
              <BsPlus className="mb-[-3px] h-7 w-8 rotate-45 p-0 text-red-600" />
              <p>Title is missing</p>
            </div>
          )}

          {genreId === -1 && (
            <div className="baseFlex">
              <BsPlus className="mb-[-3px] h-7 w-8 rotate-45 text-red-600" />
              <p>Genre hasn&apos;t been selected</p>
            </div>
          )}

          {bpm === -1 && (
            <div className="baseFlex">
              <BsPlus className="mb-[-3px] h-7 w-8 rotate-45 text-red-600" />
              <p>Tempo isn&apos;t defined</p>
            </div>
          )}

          {tabIsEffectivelyEmpty(tabData) && (
            <div className="baseFlex !flex-nowrap">
              <BsPlus className="mb-[-3px] h-7 w-8 rotate-45 text-red-600" />
              <p>Tab is empty</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="baseVertFlex w-full max-w-[350px] bg-pink-100 p-2 pt-1 text-sm text-pink-950 md:max-w-[400px] md:text-base">
        <div className="baseFlex !flex-nowrap">
          <BsPlus className="h-8 w-8 rotate-45 text-red-600" />
          <p className="mb-[1px]">Only registered users can publish a tab.</p>
        </div>
        <p className="text-xs text-gray-600 md:text-sm">
          This tab will be saved for you upon signing in.
        </p>
      </div>
    );
  }

  return (
    <>
      {editing && (
        <div className="baseVertFlex w-full gap-2">
          <div className="baseVertFlex w-full !items-start !justify-between gap-2 p-4 sm:!flex-row md:!items-center">
            <div className="baseFlex">
              {!asPath.includes("create") && (
                <Button
                  disabled={isLoadingARoute}
                  className="baseFlex py-1 pl-1 pr-3 md:py-2"
                  onClick={() => void push(`/tab/${id}`)}
                >
                  <BsArrowRightShort className="h-6 w-8 rotate-180 text-pink-100" />
                  Return to tab
                </Button>
              )}
            </div>

            <div className="baseFlex flex-wrap !justify-end gap-2">
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
                    <PopoverContent className="baseVertFlex gap-4 bg-pink-100 p-2 text-sm text-pink-950 md:text-base">
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
                      if (!currentUser) {
                        setShowUnregisteredRecordingPopover(true);
                        setUnregisteredPopoverTimeoutId(
                          setTimeout(() => {
                            setShowUnregisteredRecordingPopover(false);
                          }, 2000),
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
                      <div className="baseFlex gap-2 whitespace-nowrap text-nowrap">
                        {hasRecordedAudio ? "Edit recording" : "Record tab"}
                        <FaMicrophoneAlt className="h-4 w-4" />
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[325px] bg-pink-100 p-2 text-sm text-pink-950 md:w-[375px] md:text-base">
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
                Title <span className="text-destructiveRed">*</span>
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="My new tab"
                value={title}
                showingErrorShakeAnimation={showPulsingError && !title}
                className="w-full max-w-72"
                onChange={(e) => {
                  if (e.target.value.length > 30) return;
                  setTitle(e.target.value);
                }}
              />
            </div>

            <div
              className={`${
                classes.artist ?? ""
              } baseVertFlex w-full !items-start gap-1.5`}
            >
              <Label htmlFor="title">Artist</Label>
              <ArtistCommandCombobox customTuning={customTuning} />
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
                className="max-h-[350px] min-h-[122px]"
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
                Genre <span className="text-destructiveRed">*</span>
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
                                  boxShadow:
                                    "0 1px 1px hsla(336, 84%, 17%, 0.9)",
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
                Tuning <span className="text-destructiveRed">*</span>
              </Label>
              <TuningCommandCombobox customTuning={customTuning} />
            </div>

            <div
              className={`${
                classes.capo ?? ""
              } baseVertFlex !items-start gap-1.5`}
            >
              <Label htmlFor="capo">Capo</Label>
              <Select
                value={capo.toString()}
                onValueChange={(value) => setCapo(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup className="max-h-[300px] overflow-y-auto">
                    <SelectLabel>Capo</SelectLabel>

                    <SelectItem value={"0"}>None</SelectItem>
                    <SelectItem value={"1"}>1st fret</SelectItem>
                    <SelectItem value={"2"}>2nd fret</SelectItem>
                    <SelectItem value={"3"}>3rd fret</SelectItem>
                    <SelectItem value={"4"}>4th fret</SelectItem>
                    <SelectItem value={"5"}>5th fret</SelectItem>
                    <SelectItem value={"6"}>6th fret</SelectItem>
                    <SelectItem value={"7"}>7th fret</SelectItem>
                    <SelectItem value={"8"}>8th fret</SelectItem>
                    <SelectItem value={"9"}>9th fret</SelectItem>
                    <SelectItem value={"10"}>10th fret</SelectItem>
                    <SelectItem value={"11"}>11th fret</SelectItem>
                    <SelectItem value={"12"}>12th fret</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div
              className={`${
                classes.tempo ?? ""
              } baseVertFlex relative w-16 max-w-sm !items-start gap-1.5`}
            >
              <Label htmlFor="bpm">
                Tempo <span className="text-destructiveRed">*</span>
              </Label>
              <div className="baseFlex">
                <QuarterNote className="-ml-1 size-5" />
                <Input
                  type="text"
                  placeholder="75"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-[50px]"
                  value={bpm === -1 ? "" : bpm}
                  showingErrorShakeAnimation={showPulsingError && bpm === -1}
                  onChange={handleBpmChange}
                />
                <span className="ml-1">BPM</span>
              </div>
            </div>

            <div
              className={`${
                classes.key ?? ""
              } baseVertFlex !items-start gap-1.5`}
            >
              <Label>Key</Label>
              <Select
                value={key ?? ""}
                onValueChange={(value) => setKey(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a key" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup className="max-h-[300px] overflow-y-auto">
                    {Object.entries(KEYS_BY_LETTER).map(([letter, keys]) => (
                      <>
                        <SelectLabel>{letter}</SelectLabel>
                        {keys.map((key) => (
                          <SelectItem key={key} value={key}>
                            {key}
                          </SelectItem>
                        ))}
                      </>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div
              className={`${
                classes.difficulty ?? ""
              } baseVertFlex !items-start gap-1.5`}
            >
              <Label>
                Difficulty <span className="text-destructiveRed">*</span>
              </Label>
              <Select
                value={difficulty.toString()}
                onValueChange={(value) => setDifficulty(Number(value))}
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
                  <SelectValue placeholder="Select a difficulty">
                    <div className="baseFlex gap-2">
                      <DifficultyBars difficulty={difficulty} />
                      {DIFFICULTIES[difficulty - 1]}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[350px]">
                  <SelectGroup>
                    <SelectLabel>Difficulties</SelectLabel>

                    <SelectItem value={"1"}>
                      <div className="baseVertFlex !items-start gap-1">
                        <div className="baseFlex gap-2">
                          <DifficultyBars difficulty={1} />
                          <span className="font-medium">Beginner</span>
                        </div>
                        <p className="text-sm opacity-75">
                          Open chords, basic melodies, simple strumming.
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value={"2"}>
                      <div className="baseVertFlex !items-start gap-1">
                        <div className="baseFlex gap-2">
                          <DifficultyBars difficulty={2} />
                          <span className="font-medium">Easy</span>
                        </div>
                        <p className="text-sm opacity-75">
                          Common progressions, basic barre chords,
                          straightforward rhythms.
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value={"3"}>
                      <div className="baseVertFlex !items-start gap-1">
                        <div className="baseFlex gap-2">
                          <DifficultyBars difficulty={3} />
                          <span className="font-medium">Intermediate</span>
                        </div>
                        <p className="text-sm opacity-75">
                          Alternate picking, varied voicings, position shifts.
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value={"4"}>
                      <div className="baseVertFlex !items-start gap-1">
                        <div className="baseFlex gap-2">
                          <DifficultyBars difficulty={4} />
                          <span className="font-medium">Advanced</span>
                        </div>
                        <p className="text-sm opacity-75">
                          Fast playing, bends, slides, tapping, expressive
                          control.
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value={"5"}>
                      <div className="baseVertFlex !items-start gap-1">
                        <div className="baseFlex gap-2">
                          <DifficultyBars difficulty={5} />
                          <span className="font-medium">Expert</span>
                        </div>
                        <p className="text-sm opacity-75">
                          Virtuoso speed, sweep picking, extended voicings,
                          interpretation.
                        </p>
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
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
                <div className="baseFlex w-full !justify-between gap-4">
                  <div className="baseFlex gap-2">
                    <div className="text-2xl font-bold">{title}</div>

                    {artistName && (
                      <div className="baseFlex gap-1.5 text-lg">
                        by
                        <span className="baseFlex text-medium gap-1 underline">
                          {artistName}
                          <MdVerified className="size-4" />
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="baseFlex gap-2">
                    <AnimatePresence mode="popLayout">
                      {dynamicMetadata ? (
                        <motion.div
                          key={"crossfadeRateTab"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.25,
                          }}
                          className="baseFlex h-10 w-28"
                        >
                          <RateTab
                            tabId={id}
                            averageRating={dynamicMetadata.averageRating}
                            ratingsCount={dynamicMetadata.ratingsCount}
                            currentUser={currentUser}
                            userRating={dynamicMetadata.userRating}
                            customClassName={`${classes.rating} baseFlex w-28 gap-2 px-3 py-1`}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key={"crossfadeRateTabPlaceholder"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.25,
                          }}
                          className="baseFlex h-10 w-28 animate-pulse rounded-md bg-pink-300"
                        ></motion.div>
                      )}

                      {dynamicMetadata ? (
                        <motion.div
                          key={"crossfadeBookmarkToggle"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.25,
                          }}
                          className="baseFlex h-10 w-36"
                        >
                          <BookmarkToggle
                            tabId={id}
                            createdByUserId={createdByUserId}
                            currentUser={currentUser}
                            showText={true}
                            isBookmarked={dynamicMetadata.bookmarked}
                            customClassName={`${classes.bookmark} baseFlex w-full gap-2 px-3 py-1`}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key={"crossfadeBookmarkTogglePlaceholder"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.25,
                          }}
                          className="baseFlex h-10 w-36 animate-pulse rounded-md bg-pink-300"
                        ></motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {((userId && createdByUserId === userId) ??
                  asPath.includes("create")) && (
                  <Button
                    disabled={isLoadingARoute}
                    className="baseFlex gap-2 whitespace-nowrap text-nowrap"
                    onClick={() => {
                      if (
                        asPath.includes("create") ||
                        asPath.includes("edit")
                      ) {
                        pauseAudio(true);
                        setEditing(true);
                      } else void push(`/tab/${id}/edit`);
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
                  <div className="baseVertFlex !items-start gap-2">
                    <div className="text-2xl font-bold">{title}</div>

                    {artistName && (
                      <div className="baseFlex gap-1.5 text-lg">
                        by
                        <span className="baseFlex text-medium gap-1 underline">
                          {artistName}
                          <MdVerified className="size-4" />
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="baseFlex gap-2">
                    <AnimatePresence mode="popLayout">
                      {dynamicMetadata ? (
                        <motion.div
                          key={"crossfadeRateTab"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.25,
                          }}
                          className="baseFlex h-10 w-28"
                        >
                          <RateTab
                            tabId={id}
                            averageRating={dynamicMetadata.averageRating}
                            ratingsCount={dynamicMetadata.ratingsCount}
                            currentUser={currentUser}
                            userRating={dynamicMetadata.userRating}
                            customClassName={`${classes.rating} baseFlex w-28 gap-2 px-3 py-1`}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key={"crossfadeRateTabPlaceholder"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.25,
                          }}
                          className="baseFlex h-10 w-28 animate-pulse rounded-md bg-pink-300"
                        ></motion.div>
                      )}

                      {dynamicMetadata ? (
                        <motion.div
                          key={"crossfadeBookmarkToggle"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.25,
                          }}
                          className="baseFlex h-10 w-36"
                        >
                          <BookmarkToggle
                            tabId={id}
                            createdByUserId={createdByUserId}
                            currentUser={currentUser}
                            showText={true}
                            isBookmarked={dynamicMetadata.bookmarked}
                            customClassName={`${classes.bookmark} baseFlex w-full gap-2 px-3 py-1`}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key={"crossfadeBookmarkTogglePlaceholder"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.25,
                          }}
                          className="baseFlex h-10 w-36 animate-pulse rounded-md bg-pink-300"
                        ></motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div
                  className={`baseFlex bottom-0 right-0 w-full !justify-end gap-2 ${
                    (userId && createdByUserId === userId) ||
                    asPath.includes("create")
                      ? "relative mt-2"
                      : "absolute"
                  }`}
                >
                  {(userId && createdByUserId === userId) ??
                    (asPath.includes("create") && (
                      <Button
                        disabled={isLoadingARoute}
                        className="baseFlex gap-2"
                        onClick={() => {
                          if (
                            asPath.includes("create") ||
                            asPath.includes("edit")
                          ) {
                            pauseAudio(true);
                            setEditing(true);
                          } else void push(`/tab/${id}/edit`);
                        }}
                      >
                        {asPath.includes("edit") || asPath.includes("create")
                          ? "Continue editing"
                          : "Edit"}{" "}
                        <MdModeEditOutline className="h-5 w-5" />
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className={`${classes.viewingMetadataContainer}`}>
            <div className={`${classes.descriptionGrid}`}>
              <div
                className={`${classes.description} baseVertFlex !items-start gap-2`}
              >
                <div className="font-semibold">Description</div>

                <div className="baseVertFlex !items-start !justify-start gap-2 text-wrap break-words text-sm md:text-base lg:min-h-[44px]">
                  {description ? (
                    description.split("\n").map((paragraph, index) => (
                      <p key={index} className="text-wrap break-words">
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

              <div
                className={`${classes.createdBy} baseVertFlex w-full !items-start gap-2`}
              >
                <div className="font-semibold">Created by</div>
                <div className="baseFlex gap-2">
                  <Button
                    disabled={!tabCreator}
                    variant={"link"}
                    className="h-6 !py-0 px-0 text-base"
                  >
                    <Link
                      href={`/artist/${tabCreator?.username ?? ""}`}
                      className="baseFlex gap-2"
                    >
                      {tabCreator || fetchingTabCreator ? (
                        <div className="grid grid-cols-1 grid-rows-1">
                          <>
                            {tabCreator ? (
                              <span className="col-start-1 col-end-2 row-start-1 row-end-2 max-w-[100%] truncate">
                                {tabCreator.username}
                              </span>
                            ) : (
                              <div className="col-start-1 col-end-2 row-start-1 row-end-2 h-8 w-32 animate-pulse rounded-md bg-pink-300"></div>
                            )}
                          </>
                        </div>
                      ) : (
                        <span className="italic text-pink-200">Anonymous</span>
                      )}
                    </Link>
                  </Button>

                  <p className="whitespace-nowrap text-sm text-pink-200">
                    {`on ${new Intl.DateTimeFormat("en-US").format(createdAt ?? new Date())}`}
                  </p>
                </div>
              </div>

              <div
                className={`${classes.pageViews} self-end text-sm opacity-80`}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={"dynamicPageViews"}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{
                      duration: 0.25,
                    }}
                    className="baseFlex gap-2"
                  >
                    {dynamicMetadata?.pageViews &&
                      formatNumber(dynamicMetadata?.pageViews)}
                    <span>
                      view{dynamicMetadata?.pageViews === 1 ? "" : "s"}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>

              <Separator
                orientation="vertical"
                className={`${classes.separator} h-[2px] w-full lg:h-full lg:w-[1px]`}
              />
            </div>

            <div className={`${classes.metadataGrid}`}>
              <div
                className={`${classes.genre} baseVertFlex !items-start gap-2`}
              >
                <div className="font-semibold">Genre</div>
                {genreList[genreId] && (
                  <div
                    style={{
                      backgroundColor: genreList[genreId]?.color,
                    }}
                    className="baseFlex w-[145px] !justify-between gap-2 rounded-md px-4 py-[0.39rem]"
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
                className={`${classes.tuning} baseVertFlex !items-start gap-2`}
              >
                <div className="font-semibold">Tuning</div>
                <div className="baseFlex h-[44px] w-[145px] rounded-md border-2 font-medium">
                  {tuningNotesToName[
                    tuning.toLowerCase() as keyof typeof tuningNotesToName
                  ] ?? <PrettyTuning tuning={tuning} displayWithFlex />}
                </div>
              </div>

              <div
                className={`${classes.capo} baseVertFlex !items-start gap-2`}
              >
                <p className="font-semibold">Capo</p>
                <p className="whitespace-nowrap text-nowrap">
                  {capo === 0 ? "None" : `${getOrdinalSuffix(capo)} fret`}
                </p>
              </div>

              <div
                className={`${classes.tempo} baseVertFlex !items-start gap-2`}
              >
                <div className="font-semibold">Tempo</div>
                <div className="baseFlex">
                  <QuarterNote className="-ml-1 size-5" />
                  <span>{bpm === -1 ? "" : bpm}</span>
                  <span className="ml-1">BPM</span>
                </div>
              </div>

              <div
                className={`${classes.difficulty} baseVertFlex !items-start gap-2`}
              >
                <div className="font-semibold">Difficulty</div>
                <div className="baseFlex gap-2">
                  <DifficultyBars difficulty={3} />
                  <span>Intermediate</span>
                </div>
              </div>

              <div className={`${classes.key} baseVertFlex !items-start gap-2`}>
                <div className="font-semibold">Key</div>
                <p>{key ?? "Not specified"}</p>
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
                  "linear-gradient(315deg, hsl(6, 100%, 66%), hsl(340, 100%, 76%), hsl(297, 100%, 87%)) fixed center / cover",
              }}
              className="baseFlex h-[581px] w-[1245px] scale-75"
            >
              <div className="h-[581px] w-[1245px] bg-pink-500 bg-opacity-30">
                <TabScreenshotPreview
                  baselineBpm={bpm}
                  tuning={tuning}
                  tabData={minifiedTabData}
                  chords={chords}
                />
              </div>
            </div>
          </div>,
          document.getElementById("mainTabComponent")!,
        )}
    </>
  );
}

export default TabMetadata;
