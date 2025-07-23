import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import isEqual from "lodash.isequal";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { FaEye } from "react-icons/fa";
import { BsPlus } from "react-icons/bs";
import { FaTrashAlt } from "react-icons/fa";
import { MdModeEditOutline } from "react-icons/md";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore, type Section, type COLORS } from "~/stores/TabStore";
import { api } from "~/utils/api";
import { genreColors } from "~/utils/genreColors";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";
import { tuningNotesToName } from "~/utils/tunings";
import ArtistCombobox from "~/components/ui/ArtistCombobox";
import BookmarkToggle from "~/components/ui/BookmarkToggle";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { IoIosShareAlt } from "react-icons/io";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import classes from "./TabMetadata.module.css";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import TabScreenshotPreview from "./TabScreenshotPreview";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import { QuarterNote } from "~/utils/bpmIconRenderingHelpers";
import RateTab from "~/components/ui/RateTab";
import DifficultyBars from "~/components/ui/DifficultyBars";
import { formatNumber } from "~/utils/formatNumber";
import TuningSelect from "~/components/ui/TuningSelect";
import Verified from "~/components/ui/icons/Verified";
import getDynamicFontSize from "~/utils/getDynamicFontSize";
import { LiaEllipsisVSolid } from "react-icons/lia";
import { HiOutlineExternalLink } from "react-icons/hi";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";

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
  setIsPublishingOrUpdating: Dispatch<SetStateAction<boolean>>;
};

function TabMetadata({ customTuning, setIsPublishingOrUpdating }: TabMetadata) {
  const { userId } = useAuth();
  const { push, asPath } = useRouter();

  const {
    originalTabData,
    id,
    createdByUserId,
    createdAt,
    title,
    setTitle,
    artistId,
    artistName,
    artistIsVerified,
    description,
    setDescription,
    genre,
    setGenre,
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
    editing,
    setEditing,
    setOriginalTabData,
    audioMetadata,
    pauseAudio,
    isLoadingARoute,
    setCurrentlyPlayingMetadata,
    setCurrentChordIndex,
    viewportLabel,
  } = useTabStore((state) => ({
    originalTabData: state.originalTabData,
    id: state.id,
    createdByUserId: state.createdByUserId,
    createdAt: state.createdAt,
    title: state.title,
    setTitle: state.setTitle,
    artistId: state.artistId,
    artistName: state.artistName,
    artistIsVerified: state.artistIsVerified,
    description: state.description,
    setDescription: state.setDescription,
    genre: state.genre,
    setGenre: state.setGenre,
    tuning: state.tuning,
    bpm: state.bpm,
    setBpm: state.setBpm,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    tabData: state.tabData,
    sectionProgression: state.sectionProgression,
    capo: state.capo,
    setCapo: state.setCapo,
    editing: state.editing,
    key: state.key,
    setKey: state.setKey,
    difficulty: state.difficulty,
    setDifficulty: state.setDifficulty,
    setEditing: state.setEditing,
    setOriginalTabData: state.setOriginalTabData,
    audioMetadata: state.audioMetadata,
    pauseAudio: state.pauseAudio,
    isLoadingARoute: state.isLoadingARoute,
    setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
    setCurrentChordIndex: state.setCurrentChordIndex,
    viewportLabel: state.viewportLabel,
  }));

  const { data: dynamicMetadata } =
    api.tab.getRatingBookmarkAndViewCount.useQuery(id, {
      enabled: !editing,
    });

  const [saveButtonText, setSaveButtonText] = useState(
    asPath.includes("create") ? "Publish" : "Save",
  );
  const [deleteButtonText, setDeleteButtonText] = useState("Delete");
  const [showDeleteAlertDialog, setShowDeleteAlertDialog] = useState(false);

  const { mutate: publishTab, isLoading: isPublishing } =
    api.tab.create.useMutation({
      onSuccess: (tab) => {
        setTimeout(() => {
          setSaveButtonText("");
          setOriginalTabData(tab);
        }, 2000);

        setTimeout(() => {
          setCurrentlyPlayingMetadata(null);
          setCurrentChordIndex(0);
        }, 250);

        setTimeout(() => {
          setIsPublishingOrUpdating(false);
          void push(`/tab/${tab.id}/${encodeURIComponent(tab.title)}`);
        }, 4000);
      },
      onError: (e) => {
        console.error("Error publishing tab:", e);
        setPublishErrorOccurred(true);
        setShowPublishPopover(true);
      },
    });

  const { mutate: updateTab, isLoading: isUpdating } =
    api.tab.update.useMutation({
      onSuccess: (tab) => {
        setTimeout(() => {
          setSaveButtonText("");
          setOriginalTabData(tab);
        }, 2000);

        setTimeout(() => {
          setCurrentlyPlayingMetadata(null);
          setCurrentChordIndex(0);
        }, 250);

        setTimeout(() => {
          setIsPublishingOrUpdating(false);
          setSaveButtonText("Save");
        }, 4000);
      },
      onError: (e) => {
        console.error("Error saving tab:", e);
        setPublishErrorOccurred(true);
        setShowPublishPopover(true);
      },
    });

  const { mutate: deleteTab, isLoading: isDeleting } =
    api.tab.delete.useMutation({
      onSuccess: () => {
        setTimeout(() => {
          setDeleteButtonText("");
        }, 2000);

        setTimeout(() => {
          void push(`/create`);
        }, 4000);
      },
      onError: (e) => {
        console.error("Error deleting tab:", e);
      },
    });

  const { mutate: processPageView } = api.tab.processPageView.useMutation({
    onError: (e) => {
      console.error("Error processing page view:", e);
    },
  });

  // current user
  const { data: currentUser } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });

  // owner of tab
  const { data: tabCreator, isFetching: fetchingTabCreator } =
    api.user.getById.useQuery(createdByUserId!, {
      enabled: !!createdByUserId,
    });

  const [minifiedTabData, setMinifiedTabData] = useState<Section[]>();
  const [takingScreenshot, setTakingScreenshot] = useState(false);
  const tabPreviewScreenshotLightRef = useRef(null);
  const tabPreviewScreenshotDarkRef = useRef(null);

  const [showPublishPopover, setShowPublishPopover] = useState(false);

  const [publishErrorOccurred, setPublishErrorOccurred] = useState(false);
  const [showPulsingError, setShowPulsingError] = useState(false);

  const overMediumViewportThreshold = useViewportWidthBreakpoint(768);

  useEffect(() => {
    if (editing) return;

    let processPageViewTimeout: NodeJS.Timeout | null = null;

    processPageViewTimeout = setTimeout(() => {
      processPageView({
        tabId: id,
        tabCreatorUserId: createdByUserId ?? undefined,
        artistId: artistId ?? undefined,
      });
    }, 5000); // user must be on page for at least 5 seconds before processing page view

    return () => {
      if (processPageViewTimeout) {
        clearTimeout(processPageViewTimeout);
      }
    };
  }, [artistId, createdByUserId, editing, id, processPageView]);

  useEffect(() => {
    if (
      !minifiedTabData &&
      asPath.includes("screenshot") &&
      tabData.length > 0
    ) {
      // artificially set minifiedTabData so that the light/dark screenshots can be taken
      setMinifiedTabData(tabData.slice(0, 2));
    }
  }, [asPath, tabData, minifiedTabData]);

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
      genre === "" ||
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

  async function handleSave() {
    if (
      !userId ||
      !title ||
      !tuning ||
      genre === "" ||
      bpm === -1 ||
      tabIsEffectivelyEmpty(tabData)
    ) {
      setShowPulsingError(true);
      setShowPublishPopover(true);
      setTimeout(() => setShowPulsingError(false), 500);

      return;
    }

    setIsPublishingOrUpdating(true);
    setSaveButtonText(asPath.includes("create") ? "Publishing" : "Saving");

    setMinifiedTabData(tabData.slice(0, 2)); // screenshot can never show more than 2 sections
    setTakingScreenshot(true);

    const { domToDataUrl } = await import("modern-screenshot");

    // not ideal, but giving DOM extra time to render
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const [lightScreenshot, darkScreenshot] = await Promise.all([
      domToDataUrl(tabPreviewScreenshotLightRef.current!, {
        quality: 0.75,
      }),
      domToDataUrl(tabPreviewScreenshotDarkRef.current!, {
        quality: 0.75,
      }),
    ]);

    if (asPath.includes("create")) {
      publishTab({
        createdByUserId: userId,
        title,
        artistId,
        artistName,
        description,
        genre,
        chords,
        difficulty,
        strummingPatterns,
        tabData,
        sectionProgression,
        tuning,
        bpm,
        capo,
        key,
        lightScreenshot,
        darkScreenshot,
      });
    } else {
      updateTab({
        id,
        title,
        artistId,
        artistName,
        description,
        genre,
        chords,
        difficulty,
        strummingPatterns,
        tabData,
        sectionProgression,
        tuning,
        bpm,
        capo,
        key,
        lightScreenshot,
        darkScreenshot,
      });
    }

    setMinifiedTabData(undefined);
    setTakingScreenshot(false);
  }

  function isEqualToOriginalTabState() {
    if (!originalTabData) return false; // need to make sure this is always populated when editing..

    const originalData = {
      id: originalTabData.id,
      title: originalTabData.title,
      artist: originalTabData.artistId,
      description: originalTabData.description,
      genre: originalTabData.genre,
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
      genre,
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

    return isEqual(originalData, sanitizedCurrentTabData);
  }

  function renderSavePopoverContent() {
    if (publishErrorOccurred) {
      return (
        <div className="baseVertFlex w-full !items-start gap-2 p-2 text-sm md:text-base">
          <div className="baseFlex gap-2">
            <BsPlus className="h-8 w-8 rotate-45 text-destructive" />
            <p>Failed to publish tab. Please try again later.</p>
          </div>
        </div>
      );
    }

    if (userId) {
      return (
        <div className="baseVertFlex w-full !items-start gap-2 p-2 pr-4 text-sm md:text-base">
          {title === "" && (
            <div className="baseFlex">
              <BsPlus className="mb-[-3px] h-7 w-8 rotate-45 p-0 text-destructive" />
              <p>Title is missing</p>
            </div>
          )}

          {genre === "" && (
            <div className="baseFlex">
              <BsPlus className="mb-[-3px] h-7 w-8 rotate-45 text-destructive" />
              <p>Genre hasn&apos;t been selected</p>
            </div>
          )}

          {bpm === -1 && (
            <div className="baseFlex">
              <BsPlus className="mb-[-3px] h-7 w-8 rotate-45 text-destructive" />
              <p>Tempo isn&apos;t defined</p>
            </div>
          )}

          {tabIsEffectivelyEmpty(tabData) && (
            <div className="baseFlex">
              <BsPlus className="mb-[-3px] h-7 w-8 rotate-45 text-destructive" />
              <p>Tab is empty</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="baseVertFlex w-full max-w-[350px] p-2 pt-1 text-sm md:max-w-[400px] md:text-base">
        <div className="baseFlex">
          <BsPlus className="h-8 w-8 rotate-45 text-destructive" />
          <p className="mb-[1px]">Only registered users can publish a tab.</p>
        </div>
        <p className="text-xs text-gray md:text-sm">
          This tab will be saved for you upon signing in.
        </p>
      </div>
    );
  }

  return (
    <>
      {editing && (
        <div className="baseVertFlex w-full gap-2">
          <div className="baseFlex w-full !justify-end gap-2 p-4 sm:gap-3">
            {!asPath.includes("create") && (
              <DropdownMenu modal={true}>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Miscellaneous tab actions dropdown trigger"
                    variant={"ghost"}
                    className="px-0"
                  >
                    <LiaEllipsisVSolid className="size-7 sm:size-8" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent side={"bottom"}>
                  <DropdownMenuItem className="baseFlex">
                    <Link
                      prefetch={false}
                      href={`/tab/${id}/${encodeURIComponent(title)}`}
                      className="baseFlex w-full !justify-between gap-2 font-normal"
                      onClick={() => {
                        pauseAudio(true);
                        setEditing(false);
                      }}
                    >
                      View tab
                      <HiOutlineExternalLink className="size-4" />
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="baseFlex !justify-between gap-2 focus-within:!bg-destructive focus-within:!text-destructive-foreground active:!bg-destructive active:!text-destructive-foreground"
                    onClick={() => {
                      setShowDeleteAlertDialog(true);
                    }}
                  >
                    Delete tab
                    <FaTrashAlt className="size-4 text-inherit" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant={"secondary"}
              disabled={showPulsingError}
              onClick={handlePreview}
              className="baseFlex gap-2"
            >
              <FaEye className="h-4 w-4" />
              Preview
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
                    isPublishing ||
                    isUpdating ||
                    isDeleting ||
                    takingScreenshot ||
                    (asPath.includes("create") &&
                      saveButtonText !== "Publish") ||
                    (asPath.includes("edit") && saveButtonText !== "Save")
                  }
                  onClick={() => void handleSave()}
                  className="baseFlex overflow-hidden"
                >
                  <AnimatePresence mode={"wait"} initial={false}>
                    <motion.div
                      key={saveButtonText}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{
                        duration: 0.25,
                      }}
                      className="baseFlex w-[100px] gap-2 overflow-hidden"
                    >
                      {saveButtonText}
                      {(saveButtonText === "Publishing" ||
                        saveButtonText === "Saving") && (
                        <div
                          className="inline-block size-4 animate-spin rounded-full border-[2px] border-foreground border-t-transparent text-foreground"
                          role="status"
                          aria-label="loading"
                        >
                          <span className="sr-only">Loading...</span>
                        </div>
                      )}
                      {saveButtonText === "" && (
                        <svg
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="size-5 text-foreground"
                        >
                          <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{
                              delay: 0.2,
                              type: "tween",
                              ease: "easeOut",
                              duration: 0.3,
                            }}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                {renderSavePopoverContent()}
              </PopoverContent>
            </Popover>
          </div>

          <div className={classes.editingMetadataContainer}>
            <div
              className={`${
                classes.title ?? ""
              } baseVertFlex w-full !items-start gap-1.5`}
            >
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="My new tab"
                value={title}
                showingErrorShakeAnimation={showPulsingError && !title}
                className="w-full max-w-72"
                onChange={(e) => {
                  if (e.target.value.length > 50) return;
                  setTitle(e.target.value);
                }}
              />
            </div>

            <div
              className={`${
                classes.artist ?? ""
              } baseVertFlex w-full !items-start gap-1.5`}
            >
              <Label>Artist</Label>
              <ArtistCombobox />
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
                Genre <span className="text-destructive">*</span>
              </Label>
              <Select value={genre} onValueChange={(value) => setGenre(value)}>
                <SelectTrigger
                  style={{
                    boxShadow:
                      showPulsingError && genre === ""
                        ? "0 0 0 0.25rem hsl(var(--destructive))"
                        : "",
                    transitionProperty:
                      showPulsingError && genre === "" ? "box-shadow" : "",
                    transitionTimingFunction:
                      showPulsingError && genre === "" ? "ease-in-out" : "",
                    transitionDuration:
                      showPulsingError && genre === "" ? "500ms" : "",
                  }}
                  className={`w-[180px] ${
                    showPulsingError && genre === "" ? "animate-errorShake" : ""
                  }`}
                >
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  {[...genreColors.entries()].map(([name, color]) => {
                    return (
                      <SelectItem key={name} value={name}>
                        <div className="baseFlex gap-2">
                          <div
                            style={{
                              backgroundColor: color,
                              boxShadow: "0 1px 1px hsla(336, 84%, 17%, 0.9)",
                            }}
                            className="h-3 w-3 rounded-full"
                          ></div>
                          {name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div
              className={`${
                classes.tuning ?? ""
              } baseVertFlex max-w-sm !items-start gap-1.5`}
            >
              <Label htmlFor="tuning">
                Tuning <span className="text-destructive">*</span>
              </Label>
              <TuningSelect customTuning={customTuning} />
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
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
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
                </SelectContent>
              </Select>
            </div>

            <div
              className={`${
                classes.tempo ?? ""
              } baseVertFlex relative w-16 max-w-sm !items-start gap-1.5`}
            >
              <Label htmlFor="bpm">
                Tempo <span className="text-destructive">*</span>
              </Label>
              <div className="baseFlex">
                <QuarterNote className="-ml-1 size-5" />
                <Input
                  type="text"
                  placeholder="75"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-[53px]"
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
                  <SelectGroup>
                    {Object.entries(KEYS_BY_LETTER).map(([letter, keys]) => (
                      <Fragment key={letter}>
                        <SelectLabel>{letter}</SelectLabel>
                        {keys.map((key) => (
                          <SelectItem key={key} value={key}>
                            {key}
                          </SelectItem>
                        ))}
                      </Fragment>
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
                Difficulty <span className="text-destructive">*</span>
              </Label>
              <Select
                value={difficulty.toString()}
                onValueChange={(value) => setDifficulty(Number(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a difficulty">
                    <div className="baseFlex gap-2">
                      <DifficultyBars difficulty={difficulty} />
                      {DIFFICULTIES[difficulty - 1]}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[350px]">
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
                        Common progressions, basic barre chords, straightforward
                        rhythms.
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
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {!editing && (
        <div className="min-h-[100px] w-full">
          <div className="baseVertFlex !flex-start w-full !items-start gap-2 border-b bg-accent px-4 py-4 text-primary-foreground shadow-md sm:!flex-row sm:!items-center sm:gap-4 md:rounded-t-xl tablet:!px-6">
            {overMediumViewportThreshold ? (
              <div className="baseFlex w-full !justify-between gap-4">
                <div className="baseFlex !justify-start gap-2">
                  <div
                    style={{
                      fontSize: getDynamicFontSize(title, 20, 24, 50),
                    }}
                    className="max-w-[100%] text-wrap font-bold"
                  >
                    {title}
                  </div>

                  {artistName && (
                    <div className="baseFlex gap-2 text-lg">
                      by
                      <Button variant={"link"} asChild>
                        <Link
                          prefetch={false}
                          href={`/artist/${encodeURIComponent(artistName)}/${artistId}/filters`}
                          className="!h-6 !p-0"
                        >
                          <div className="baseFlex gap-1 text-lg font-medium">
                            {artistIsVerified && (
                              <Verified className="size-5 shrink-0" />
                            )}
                            <span className="max-w-[300px] truncate">
                              {artistName}
                            </span>
                          </div>
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="baseFlex shrink-0 gap-3">
                  {((userId && createdByUserId === userId) ||
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
                      <MdModeEditOutline className="size-5" />
                    </Button>
                  )}

                  {!asPath.includes("create") && !asPath.includes("edit") && (
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
                            tabCreatorUserId={createdByUserId ?? undefined}
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
                          className="baseFlex pulseAnimation h-10 w-28 rounded-md bg-primary-foreground/50"
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
                          className="baseFlex pulseAnimation h-10 w-36 rounded-md bg-primary-foreground/50"
                        ></motion.div>
                      )}

                      <Button
                        variant={"secondary"}
                        size={"icon"}
                        disabled={isLoadingARoute}
                        onClick={async () => {
                          try {
                            await navigator.share({
                              title,
                              text: `Check out this tab I found on Autostrum!`,
                              url: `${window.location.origin}/tab/${id}/${encodeURIComponent(title)}`,
                            });
                          } catch (error) {
                            console.error("Error sharing tab:", error);
                          }
                        }}
                      >
                        <IoIosShareAlt className="size-5" />
                      </Button>
                    </AnimatePresence>
                  )}
                </div>
              </div>
            ) : (
              <div className="baseVertFlex relative w-full !items-start gap-4 sm:!flex-row sm:!items-end">
                <div className="baseVertFlex w-full !items-start gap-4">
                  <div className="baseVertFlex w-full !items-start gap-2">
                    <div
                      style={{
                        fontSize: getDynamicFontSize(title, 20, 24, 50),
                      }}
                      className="text-wrap font-bold"
                    >
                      {title}
                    </div>

                    {artistName && (
                      <div className="baseFlex w-full max-w-[100%] !justify-start gap-1.5 text-lg">
                        by
                        <Button variant={"link"} asChild>
                          <Link
                            prefetch={false}
                            href={`/artist/${encodeURIComponent(artistName)}/${artistId}/filters`}
                            className="baseFlex !h-6 !justify-start !p-0"
                          >
                            <div className="baseFlex w-full gap-1 text-lg font-medium">
                              {artistIsVerified && (
                                <Verified className="size-5 shrink-0" />
                              )}
                              <span className="max-w-full truncate">
                                {artistName}
                              </span>
                            </div>
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>

                  <AnimatePresence mode="popLayout">
                    <div className="baseFlex gap-3">
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
                            tabCreatorUserId={createdByUserId ?? undefined}
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
                          className="baseFlex pulseAnimation h-10 w-28 rounded-md bg-primary-foreground/50"
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
                          className="baseFlex pulseAnimation h-10 w-36 rounded-md bg-primary-foreground/50"
                        ></motion.div>
                      )}

                      <Button
                        variant={"secondary"}
                        disabled={isLoadingARoute}
                        onClick={async () => {
                          try {
                            await navigator.share({
                              title,
                              text: `Check out this tab I found on Autostrum!`,
                              url: `${window.location.origin}/tab/${id}/${encodeURIComponent(title)}`,
                            });
                          } catch (error) {
                            console.error("Error sharing tab:", error);
                          }
                        }}
                        className="!p-2"
                      >
                        <IoIosShareAlt className="size-5" />
                      </Button>
                    </div>
                  </AnimatePresence>
                </div>

                {((userId && createdByUserId === userId) ||
                  asPath.includes("create")) && (
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
                      : "Edit"}
                    <MdModeEditOutline className="size-5" />
                  </Button>
                )}
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
                    <span className="italic text-foreground/70">
                      No description provided.
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`${classes.createdBy} baseVertFlex w-full !items-start gap-2`}
              >
                <div className="font-semibold">Created by</div>
                <div className="baseFlex h-6 gap-2">
                  <Button
                    disabled={!tabCreator}
                    variant={"link"}
                    className="h-6 !py-0 px-0 text-base"
                  >
                    <Link
                      prefetch={false}
                      href={`/user/${tabCreator?.username ?? ""}/filters`}
                      className="baseFlex gap-2"
                    >
                      <AnimatePresence mode="popLayout">
                        <motion.div
                          key={fetchingTabCreator ? "loading" : "loaded"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="baseFlex"
                        >
                          {fetchingTabCreator ? (
                            <div className="pulseAnimation col-start-1 col-end-2 row-start-1 row-end-2 h-6 w-32 rounded-md bg-foreground/50"></div>
                          ) : (
                            <>
                              {tabCreator ? (
                                <span className="col-start-1 col-end-2 row-start-1 row-end-2 max-w-[100%] truncate">
                                  {tabCreator.username}
                                </span>
                              ) : (
                                <span className="italic text-foreground/75">
                                  Anonymous
                                </span>
                              )}
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </Link>
                  </Button>

                  <motion.div
                    layout
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="mt-[2px] whitespace-nowrap text-sm opacity-80"
                  >
                    {`on ${new Intl.DateTimeFormat("en-US").format(createdAt ?? new Date())}`}
                  </motion.div>
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
                    className="baseFlex gap-1"
                  >
                    {dynamicMetadata?.pageViews &&
                      formatNumber(dynamicMetadata?.pageViews)}
                    <span>
                      view{dynamicMetadata?.pageViews === 1 ? "" : "s"}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <Separator
              orientation={
                viewportLabel.includes("mobile") ? "horizontal" : "vertical"
              }
              className={`${classes.separator} my-4 h-[2px] w-full bg-gray/50 lg:mx-4 lg:my-0 lg:h-full lg:w-[1px] xl:mx-8`}
            />

            <div className={`${classes.metadataGrid}`}>
              <div
                className={`${classes.genre} baseVertFlex !items-start gap-2`}
              >
                <div className="font-semibold">Genre</div>
                <Badge
                  style={{
                    backgroundColor: genreColors
                      .get(genre)
                      ?.replace(/\)$/, " / 0.1)"),
                    borderColor: genreColors.get(genre),
                    border: "1px solid",
                    color: genreColors.get(genre),
                  }}
                  className="px-4 py-2.5"
                >
                  {genre}
                </Badge>
              </div>

              <div
                className={`${classes.tuning} baseVertFlex !items-start gap-2`}
              >
                <div className="font-semibold">Tuning</div>
                {tuningNotesToName[
                  tuning.toLowerCase() as keyof typeof tuningNotesToName
                ] ?? <PrettyTuning tuning={tuning} displayWithFlex />}
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

      <AlertDialog
        open={showDeleteAlertDialog}
        onOpenChange={(open) => {
          if (!open) setShowDeleteAlertDialog(false);
        }}
      >
        <AlertDialogContent className="border bg-secondary shadow-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">
              Delete Tab
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              Are you sure you want to delete this tab? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="baseFlex mt-4 gap-4">
            <Button
              variant={"outline"}
              onClick={() => setShowDeleteAlertDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant={"destructive"}
              disabled={deleteButtonText !== "Delete" || isLoadingARoute}
              onClick={() => {
                setDeleteButtonText("Deleting");
                deleteTab(id);
              }}
              className="baseFlex overflow-hidden"
            >
              <AnimatePresence mode={"wait"} initial={false}>
                <motion.div
                  key={deleteButtonText}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{
                    duration: 0.25,
                  }}
                  className="baseFlex w-[85px] gap-2 overflow-hidden"
                >
                  {deleteButtonText === "Delete" && (
                    <FaTrashAlt className="h-4 w-4" />
                  )}
                  {deleteButtonText}
                  {deleteButtonText === "Deleting" && (
                    <div
                      className="inline-block size-4 animate-spin rounded-full border-[2px] border-foreground border-t-transparent text-foreground"
                      role="status"
                      aria-label="loading"
                    >
                      <span className="sr-only">Loading...</span>
                    </div>
                  )}
                  {deleteButtonText === "" && (
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="size-5 text-foreground"
                    >
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{
                          delay: 0.2,
                          type: "tween",
                          ease: "easeOut",
                          duration: 0.3,
                        }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </motion.div>
              </AnimatePresence>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {minifiedTabData &&
        createPortal(
          <div className="size-full overflow-hidden">
            <div
              ref={tabPreviewScreenshotLightRef}
              id="tabPreviewScreenshotLight"
              style={{
                backgroundColor: `hsl(${SCREENSHOT_COLORS["peony" as COLORS]["light" as "light" | "dark"]["screenshot-background"]})`,
              }}
              className="baseFlex h-[615px] w-[1318px] grayscale"
            >
              <TabScreenshotPreview
                tabData={minifiedTabData}
                color={"peony"}
                theme={"light"}
              />
            </div>

            <div
              ref={tabPreviewScreenshotDarkRef}
              id="tabPreviewScreenshotDark"
              style={{
                backgroundColor: `hsl(${SCREENSHOT_COLORS["peony" as COLORS]["dark" as "light" | "dark"]["screenshot-background"]})`,
              }}
              className="baseFlex h-[615px] w-[1318px] grayscale"
            >
              <TabScreenshotPreview
                tabData={minifiedTabData}
                color={"peony"}
                theme={"dark"}
              />
            </div>
          </div>,
          document.getElementById("mainTabComponent")!,
        )}
    </>
  );
}

export default TabMetadata;
