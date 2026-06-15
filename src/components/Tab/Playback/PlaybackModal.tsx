import { useEffect, useMemo, useRef, useState } from "react";
import PlaybackAudioControls from "~/components/Tab/Playback/PlaybackAudio/PlaybackAudioControls";
import PlaybackBottomMetadata from "~/components/Tab/Playback/PlaybackBottomMetadata";
import PlaybackChordStrip from "~/components/Tab/Playback/PlaybackChordStrip";
import PlaybackTopMetadata from "~/components/Tab/Playback/PlaybackTopMetadata";
import { AnimatePresence, motion } from "framer-motion";
import { FocusTrap } from "focus-trap-react";
import {
  useTabStore,
} from "~/stores/TabStore";
import PlaybackMenuContent from "~/components/Tab/Playback/PlaybackMenuContent";
import PlaybackScrollingContainer from "~/components/Tab/Playback/PlaybackScrollingContainer";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface ChordLayoutData {
  scrollPositions: number[];
  chordWidths: number[];
  totalWidth: number;
  durations: number[];
  // Virtualization indices for smooth loop transitions
  virtualizationIndex: number; // Index where the last visible chord comes into view
  virtualizationStartIndex: number; // Index where the full viewport ends (start of "catchup" zone)
  virtualizationCatchupIndex: number; // Index where the beginning of the tab leaves the viewport
}

function PlaybackModal() {
  const {
    currentChordIndex,
    expandedTabData,
    playbackSpeed,
    playbackMetadata,
    audioMetadata,
    showPlaybackModal,
    setShowPlaybackModal,
    visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth,
    playbackModalViewingState,
    viewportLabel,
    currentlyPlayingMetadata,
    setAudioMetadata,
    setPlaybackModalViewingState,
    pauseAudio,
    setCurrentChordIndex,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    expandedTabData: state.expandedTabData,
    playbackSpeed: state.playbackSpeed,
    playbackMetadata: state.playbackMetadata,
    audioMetadata: state.audioMetadata,
    showPlaybackModal: state.showPlaybackModal,
    setShowPlaybackModal: state.setShowPlaybackModal,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth: state.setVisiblePlaybackContainerWidth,
    playbackModalViewingState: state.playbackModalViewingState,
    viewportLabel: state.viewportLabel,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    setAudioMetadata: state.setAudioMetadata,
    setPlaybackModalViewingState: state.setPlaybackModalViewingState,
    pauseAudio: state.pauseAudio,
    setCurrentChordIndex: state.setCurrentChordIndex,
  }));
  const scrollStripRef = useRef<HTMLDivElement | null>(null);

  const containerRef = (element: HTMLDivElement | null) => {
    if (element && !containerElement) setContainerElement(element);
  };
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [showBackgroundBlur, setShowBackgroundBlur] = useState(false);

  const [initialPlaceholderWidth, setInitialPlaceholderWidth] = useState(0);

  // Per-chord repetition tracking for smooth infinite scroll without visual snapping
  // Each chord tracks how many times it has "looped" for positioning purposes
  const [chordRepetitions, setChordRepetitions] = useState<number[]>([]);

  // v avoids polluting the store with these extra semi-local values
  const [loopRange, setLoopRange] = useState<[number, number]>([
    audioMetadata.startLoopIndex,
    audioMetadata.endLoopIndex === -1
      ? audioMetadata.fullCurrentlyPlayingMetadataLength - 1
      : audioMetadata.endLoopIndex,
  ]);
  const [tabProgressValue, setTabProgressValue] = useState(0);

  // loopCount tracks how many full iterations through the tab we've completed
  // This is derived directly from currentChordIndex
  const loopCount = useMemo(() => {
    if (!currentlyPlayingMetadata) return 0;
    return Math.floor(currentChordIndex / currentlyPlayingMetadata.length);
  }, [currentChordIndex, currentlyPlayingMetadata]);

  useModalScrollbarHandling(true);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("disablePullToRefresh");

    return () => {
      html.classList.remove("disablePullToRefresh");
    };
  }, []);

  // Initialize chordRepetitions when expandedTabData changes
  useEffect(() => {
    if (expandedTabData && expandedTabData.length > 0) {
      setChordRepetitions(new Array(expandedTabData.length).fill(0));
    }
  }, [expandedTabData]);

  // Compute chord layout data (positions, widths, durations) - memoized
  const chordLayoutData = useMemo<ChordLayoutData | null>(() => {
    if (
      !expandedTabData ||
      !playbackMetadata ||
      expandedTabData.length === 0 ||
      visiblePlaybackContainerWidth === 0
    ) {
      return null;
    }

    const scrollPositions: number[] = [];
    const chordWidths: number[] = [];
    let offsetLeft = 0;

    for (let i = 0; i < expandedTabData.length; i++) {
      const chord = expandedTabData[i];

      const isMeasureLine =
        chord?.type === "tab" && chord?.data.chordData.includes("|");

      const isSpacerChord =
        (chord?.type === "tab" && chord?.data.chordData[0] === "-1") ||
        (chord?.type === "strum" && chord?.data.strumIndex === -1);

      const chordWidth = isMeasureLine
        ? 2
        : isSpacerChord
          ? 16
          : chord?.type === "tab"
            ? 34
            : 40;

      scrollPositions[i] = offsetLeft;
      chordWidths[i] = chordWidth;
      offsetLeft += chordWidth;
    }

    const totalWidth = offsetLeft;
    const finalChordWidth = chordWidths[chordWidths.length - 1] ?? 0;

    const durations = expandedTabData.map((chord, index) => {
      const metadata = playbackMetadata[index];

      if (!metadata) return 0;

      const isZeroDurationMeasureLine =
        chord?.type === "tab" && chord?.data.chordData.includes("|");
      const isZeroDurationTypeSpacer =
        (chord?.type === "tab" && chord?.data.chordData[0] === "-1") ||
        (chord?.type === "strum" && chord?.data.strumIndex === -1);

      if (isZeroDurationMeasureLine || isZeroDurationTypeSpacer) {
        return 0;
      }

      const { bpm, noteLengthMultiplier } = metadata;
      return 60 / ((bpm / noteLengthMultiplier) * playbackSpeed);
    });

    // Compute virtualization indices for smooth loop transitions
    // virtualizationIndex: the earliest chord index where the final chord becomes visible
    let virtualizationIndex = 0;
    for (let i = expandedTabData.length - 1; i >= 0; i--) {
      const currentPosition = scrollPositions[i];
      const lastChordPosition = scrollPositions[scrollPositions.length - 1];

      if (currentPosition === undefined || lastChordPosition === undefined) {
        continue;
      }

      if (
        currentPosition + visiblePlaybackContainerWidth * 0.5 <=
        lastChordPosition + finalChordWidth
      ) {
        virtualizationIndex = i;
        break;
      }
    }

    // virtualizationStartIndex: where the full viewport ends (chords after this won't be incremented in first phase)
    let virtualizationStartIndex = 0;
    for (let i = expandedTabData.length - 1; i >= 0; i--) {
      const currentPosition = scrollPositions[i];
      const lastChordPosition = scrollPositions[scrollPositions.length - 1];

      if (currentPosition === undefined || lastChordPosition === undefined) {
        continue;
      }

      if (
        currentPosition + visiblePlaybackContainerWidth <=
        lastChordPosition + finalChordWidth
      ) {
        virtualizationStartIndex = i;
        break;
      }
    }

    // virtualizationCatchupIndex: where the beginning of the tab leaves the viewport
    let virtualizationCatchupIndex = 0;
    for (let i = 0; i < expandedTabData.length - 1; i++) {
      const currentPosition = scrollPositions[i];

      if (currentPosition === undefined) {
        continue;
      }

      if (currentPosition - visiblePlaybackContainerWidth * 0.5 >= 0) {
        virtualizationCatchupIndex = i;
        break;
      }
    }

    return {
      scrollPositions,
      chordWidths,
      totalWidth,
      durations,
      virtualizationIndex,
      virtualizationStartIndex,
      virtualizationCatchupIndex,
    };
  }, [
    expandedTabData,
    playbackMetadata,
    playbackSpeed,
    visiblePlaybackContainerWidth,
  ]);

  // Handle resize
  useEffect(() => {
    function handleResize() {
      if (
        modalContentRef.current === null ||
        modalContentRef.current.clientWidth === 0 ||
        modalContentRef.current.clientHeight === 0
      ) {
        return;
      }

      setInitialPlaceholderWidth(modalContentRef.current.clientWidth / 2 - 5);
      setVisiblePlaybackContainerWidth(modalContentRef.current.clientWidth);
    }

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [
    expandedTabData,
    showPlaybackModal,
    containerElement,
    setVisiblePlaybackContainerWidth,
  ]);

  // Reset on modal close
  useEffect(() => {
    return () => {
      setPlaybackModalViewingState("Practice");
      setCurrentChordIndex(0);
    };
  }, [setPlaybackModalViewingState, setCurrentChordIndex]);

  return (
    <motion.div
      key={"PlaybackModalBackdrop"}
      // FYI: made this bg-black/70 instead of bg-black/60 since the backdrop-blur-sm caused unfortunate
      // smearing of the noise texture background
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/70 backdrop-blur-sm"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowPlaybackModal(false);
          pauseAudio(true);
          setTimeout(() => {
            setPlaybackModalViewingState("Practice");
          }, 150); // waiting for the modal to actually close before changing state
          if (audioMetadata.editingLoopRange) {
            setAudioMetadata({
              ...audioMetadata,
              editingLoopRange: false,
            });
          }
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true, // to click on the effect dialog "x"
          initialFocus: false,
        }}
      >
        <div
          ref={modalContentRef}
          tabIndex={-1}
          className="baseVertFlex playbackModalGradient relative h-dvh w-screen max-w-none !justify-between gap-0 !rounded-none p-0 mobileNarrowLandscape:!justify-center tablet:h-[650px] tablet:max-w-6xl tablet:!rounded-lg"
        >
          <PlaybackTopMetadata
            tabProgressValue={tabProgressValue}
            setTabProgressValue={setTabProgressValue}
          />

          <AnimatePresence mode="popLayout">
            {showBackgroundBlur && (
              <motion.div
                key="BackgroundBlur"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 top-0 z-10 size-full bg-black/60 backdrop-blur-sm"
                onClick={() => {
                  setShowBackgroundBlur(false);
                }}
              ></motion.div>
            )}

            {playbackModalViewingState === "Practice" && (
              <motion.div
                key="PracticeTab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="baseVertFlex relative size-full select-none"
              >
                <div className="w-full overflow-hidden">
                  <PlaybackScrollingContainer
                    loopCount={loopCount}
                    setChordRepetitions={setChordRepetitions}
                    scrollPositionsLength={
                      chordLayoutData?.scrollPositions.length ?? 0
                    }
                  >
                    <div
                      ref={containerRef}
                      className="relative flex h-[255px] w-full overflow-hidden mobilePortrait:h-[280px]"
                    >
                      <div className="baseFlex absolute left-0 top-0 size-full">
                        <div className="mb-[72px] h-[140px] w-full mobilePortrait:h-[165px]"></div>
                        {/* currently this fixes the highlight line extending past rounded borders of
                        sections, but puts it behind measure lines. maybe this is a fine tradeoff? */}
                        <div className="z-0 mb-[72px] ml-1 h-[140px] w-[2px] shrink-0 bg-primary mobilePortrait:h-[164px]"></div>
                        <div className="mb-[72px] h-[140px] w-full mobilePortrait:h-[165px]"></div>
                      </div>

                      {chordLayoutData && expandedTabData && (
                        <PlaybackChordStrip
                          scrollStripRef={scrollStripRef}
                          initialPlaceholderWidth={initialPlaceholderWidth}
                          chordLayoutData={chordLayoutData}
                          chordRepetitions={chordRepetitions}
                          setChordRepetitions={setChordRepetitions}
                        />
                      )}
                    </div>
                  </PlaybackScrollingContainer>
                </div>
              </motion.div>
            )}

            {!viewportLabel.includes("mobile") && <PlaybackMenuContent />}
          </AnimatePresence>

          {playbackModalViewingState === "Practice" && (
            <div className="baseVertFlex w-full gap-1 lg:gap-2">
              <PlaybackAudioControls
                chordDurations={chordLayoutData?.durations ?? []}
                loopRange={loopRange}
                setLoopRange={setLoopRange}
                tabProgressValue={tabProgressValue}
                setTabProgressValue={setTabProgressValue}
                setChordRepetitions={setChordRepetitions}
                scrollPositionsLength={
                  chordLayoutData?.scrollPositions.length ?? 0
                }
              />

              <PlaybackBottomMetadata
                loopRange={loopRange}
                setLoopRange={setLoopRange}
                tabProgressValue={tabProgressValue}
                setTabProgressValue={setTabProgressValue}
                showBackgroundBlur={showBackgroundBlur}
                setShowBackgroundBlur={setShowBackgroundBlur}
              />
            </div>
          )}

          <Button
            variant={"modalClose"}
            onClick={() => {
              setShowPlaybackModal(false);
              pauseAudio();

              if (audioMetadata.editingLoopRange) {
                setAudioMetadata({
                  ...audioMetadata,
                  editingLoopRange: false,
                });
              }
            }}
            className="shadow-none"
          >
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default PlaybackModal;
