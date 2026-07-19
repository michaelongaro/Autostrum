import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PlaybackAudioControls from "~/components/Tab/Playback/PlaybackAudio/PlaybackAudioControls";
import PlaybackBottomMetadata from "~/components/Tab/Playback/PlaybackBottomMetadata";
import PlaybackStrummedChord from "~/components/Tab/Playback/PlaybackStrummedChord";
import PlaybackTabChord from "~/components/Tab/Playback/PlaybackTabChord";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTopMetadata from "~/components/Tab/Playback/PlaybackTopMetadata";
import { AnimatePresence, motion } from "framer-motion";
import { FocusTrap } from "focus-trap-react";
import {
  type PlaybackTabChord as PlaybackTabChordType,
  type PlaybackStrummedChord as PlaybackStrummedChordType,
  type PlaybackLoopDelaySpacerChord,
  useTabStore,
  type FullNoteLengths,
} from "~/stores/TabStore";
import PlaybackMenuContent from "~/components/Tab/Playback/PlaybackMenuContent";
import PlaybackScrollingContainer from "~/components/Tab/Playback/PlaybackScrollingContainer";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import PlaybackAnimatedStrip from "~/components/Tab/Playback/PlaybackAnimatedStrip";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";
import {
  computePlaybackChordLayoutData,
  resyncChordRepetitionsAfterIndexJump,
  type PlaybackChordLayoutData,
} from "~/utils/playbackModalLayout";
import { getLoopEndSliderValue } from "~/utils/loopRangeHelpers";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface RenderVisibleChord {
  chord:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
  index: number;
  prevChord?:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
  nextChord?:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
  isFirstChordInSection: boolean;
  isDimmed: boolean;
  isHighlighted: boolean;
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
    loopDelay,
    currentlyPlayingMetadata,
    setAudioMetadata,
    setPlaybackModalViewingState,
    pauseAudio,
    setCurrentChordIndex,
    reanchorPlaybackStripAnimation,
    playTab,
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
    loopDelay: state.loopDelay,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    setAudioMetadata: state.setAudioMetadata,
    setPlaybackModalViewingState: state.setPlaybackModalViewingState,
    pauseAudio: state.pauseAudio,
    setCurrentChordIndex: state.setCurrentChordIndex,
    reanchorPlaybackStripAnimation: state.reanchorPlaybackStripAnimation,
    playTab: state.playTab,
  }));

  // Always track the latest strip container — a one-shot ref goes stale when
  // AnimatePresence remounts the Practice view after switching modal tabs.
  const containerRef = (element: HTMLDivElement | null) => {
    setContainerElement(element);
  };
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const measureRetryRafRef = useRef<number | null>(null);
  const wasDocumentHiddenRef = useRef(false);
  const orientationBucketRef = useRef<"portrait" | "landscape">(
    typeof window !== "undefined" && window.innerWidth > window.innerHeight
      ? "landscape"
      : "portrait",
  );
  // Sentinel so the first effect run always initializes chordRepetitions.
  const prevExpandedTabDataRef = useRef<typeof expandedTabData | undefined>(
    undefined,
  );
  const prevChordIndexRef = useRef(currentChordIndex);

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
    getLoopEndSliderValue(
      audioMetadata.endLoopIndex,
      audioMetadata.fullCurrentlyPlayingMetadataLength,
    ),
  ]);
  const [tabProgressValue, setTabProgressValue] = useState(0);

  useModalScrollbarHandling(true);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("disablePullToRefresh");

    return () => {
      html.classList.remove("disablePullToRefresh");
    };
  }, []);

  const measurePlaybackContainer = useCallback(() => {
    const modalElement = modalContentRef.current;

    if (
      modalElement === null ||
      modalElement.clientWidth === 0 ||
      modalElement.clientHeight === 0
    ) {
      return false;
    }

    const width = modalElement.clientWidth;
    setInitialPlaceholderWidth(width / 2 - 5);
    setVisiblePlaybackContainerWidth(width);
    return true;
  }, [setVisiblePlaybackContainerWidth]);

  const scheduleMeasureRetry = useCallback(() => {
    if (measureRetryRafRef.current !== null) {
      cancelAnimationFrame(measureRetryRafRef.current);
    }

    // Orientation / app-switch can report 0x0 for a frame or two. Retry on the
    // next couple of animation frames before giving up on this pulse.
    let attempts = 0;
    const retry = () => {
      attempts += 1;
      if (measurePlaybackContainer() || attempts >= 8) {
        measureRetryRafRef.current = null;
        return;
      }
      measureRetryRafRef.current = requestAnimationFrame(retry);
    };

    measureRetryRafRef.current = requestAnimationFrame(retry);
  }, [measurePlaybackContainer]);

  // Initialize / resync chordRepetitions when expanded tab data changes.
  // If playback is still active (e.g. loop-range recompile), re-anchor the
  // strip clock so completedLoops does not stay tied to a stale start time.
  // Orientation changes pause first, so they typically skip the re-anchor path.
  useEffect(() => {
    if (!expandedTabData || expandedTabData.length === 0) {
      setChordRepetitions([]);
      prevExpandedTabDataRef.current = expandedTabData;
      return;
    }

    const previousExpandedTabData = prevExpandedTabDataRef.current;
    const expandedTabDataChanged = previousExpandedTabData !== expandedTabData;
    prevExpandedTabDataRef.current = expandedTabData;

    // currentChordIndex / playing are deps so the change-handler closure is
    // fresh, but we only mutate repetitions when the compiled strip changes.
    if (!expandedTabDataChanged) {
      return;
    }

    setChordRepetitions(new Array(expandedTabData.length).fill(0));

    // Orientation recompiles can shrink artificial loops; keep the index in range.
    const clampedIndex =
      currentChordIndex >= expandedTabData.length ? 0 : currentChordIndex;
    if (clampedIndex !== currentChordIndex) {
      setCurrentChordIndex(clampedIndex);
      prevChordIndexRef.current = clampedIndex;
    }

    if (audioMetadata.playing) {
      reanchorPlaybackStripAnimation();
    }
  }, [
    expandedTabData,
    currentChordIndex,
    audioMetadata.playing,
    setCurrentChordIndex,
    reanchorPlaybackStripAnimation,
  ]);

  function closePlaybackModal() {
    setShowPlaybackModal(false);

    pauseAudio();

    if (audioMetadata.editingLoopRange) {
      setAudioMetadata({
        ...audioMetadata,
        editingLoopRange: false,
      });
    }
  }

  const chordLayoutData = useMemo<PlaybackChordLayoutData | null>(
    () =>
      computePlaybackChordLayoutData({
        expandedTabData,
        playbackMetadata,
        playbackSpeed,
        visiblePlaybackContainerWidth,
      }),
    [
      expandedTabData,
      playbackMetadata,
      playbackSpeed,
      visiblePlaybackContainerWidth,
    ],
  );

  // Primary / catchup virtualization, plus resync after large index jumps
  // (background-tab timer throttling skips intermediate thresholds).
  useLayoutEffect(() => {
    if (!chordLayoutData || chordRepetitions.length === 0) {
      prevChordIndexRef.current = currentChordIndex;
      return;
    }

    const previousChordIndex = prevChordIndexRef.current;
    prevChordIndexRef.current = currentChordIndex;

    const indexJumped = Math.abs(currentChordIndex - previousChordIndex) > 1;
    const wrappedForward =
      audioMetadata.playing && currentChordIndex < previousChordIndex;

    if (indexJumped || wrappedForward) {
      setChordRepetitions((prev) =>
        resyncChordRepetitionsAfterIndexJump({
          length: prev.length,
          previousRepetitions: prev,
          currentChordIndex,
          previousChordIndex,
          virtualizationIndex: chordLayoutData.virtualizationIndex,
          virtualizationStartIndex: chordLayoutData.virtualizationStartIndex,
          virtualizationCatchupIndex:
            chordLayoutData.virtualizationCatchupIndex,
          canVirtualize: chordLayoutData.canVirtualize,
          wrappedForward,
        }),
      );
      return;
    }

    if (!chordLayoutData.canVirtualize) {
      return;
    }

    // Primary: bump the first half once the end of the strip is entering view.
    if (
      currentChordIndex >= chordLayoutData.virtualizationIndex &&
      chordRepetitions[0] === chordRepetitions[chordRepetitions.length - 1]
    ) {
      setChordRepetitions((prev) => {
        const newRepetitions = (prev[0] ?? 0) + 1;
        const oldRepetitions = prev[0] ?? 0;
        const secondHalfLength =
          prev.length - chordLayoutData.virtualizationStartIndex;

        return [
          ...(new Array(chordLayoutData.virtualizationStartIndex).fill(
            newRepetitions,
          ) as number[]),
          ...(new Array(secondHalfLength).fill(oldRepetitions) as number[]),
        ];
      });
      return;
    }

    // Catchup: finish bumping the trailing half after the previous loop leaves.
    if (
      currentChordIndex < chordLayoutData.virtualizationIndex &&
      currentChordIndex >= chordLayoutData.virtualizationCatchupIndex &&
      chordRepetitions[0] !== chordRepetitions[chordRepetitions.length - 1]
    ) {
      setChordRepetitions((prev) => {
        const newRepetitions = prev[0] ?? 0;
        return new Array(prev.length).fill(newRepetitions) as number[];
      });
    }
  }, [
    chordLayoutData,
    chordRepetitions,
    currentChordIndex,
    audioMetadata.playing,
  ]);

  // Measure modal width on mount/resize/orientation/visibility. Zero-size
  // frames (common mid-orientation on mobile) schedule rAF retries.
  // Portrait↔landscape while playing pauses playback for a stable re-layout.
  useEffect(() => {
    function getOrientationBucket(): "portrait" | "landscape" {
      return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
    }

    function pauseForOrientationChange() {
      if (!audioMetadata.playing || !showPlaybackModal) {
        return;
      }

      // Keep currentChordIndex so the user can resume from the same spot after
      // the modal settles in the new orientation.
      pauseAudio();
      setChordRepetitions((prev) =>
        prev.length > 0 ? new Array(prev.length).fill(0) : prev,
      );
    }

    function handleMeasurePulse() {
      if (!measurePlaybackContainer()) {
        scheduleMeasureRetry();
      }
    }

    function handleOrientationBucketChange() {
      const nextBucket = getOrientationBucket();
      const orientationFlipped = nextBucket !== orientationBucketRef.current;
      orientationBucketRef.current = nextBucket;

      if (orientationFlipped) {
        pauseForOrientationChange();
      }

      handleMeasurePulse();
    }

    function handleOrientationChangeEvent() {
      // orientationchange often fires before layout settles; pause immediately,
      // then remeasure (with rAF retries) once dimensions are non-zero.
      pauseForOrientationChange();
      handleOrientationBucketChange();
    }

    function handleVisibilityResume() {
      handleMeasurePulse();

      if (document.visibilityState === "hidden") {
        wasDocumentHiddenRef.current = true;
        return;
      }

      if (!wasDocumentHiddenRef.current) {
        return;
      }
      wasDocumentHiddenRef.current = false;

      // App-switching can advance the scheduler through multiple loop wraps in
      // one JS turn, so React only sees the final chord index (no wrap signal).
      // Soft pause+resume from the current chord fully rebuilds strip state.
      if (audioMetadata.playing && showPlaybackModal) {
        const location = audioMetadata.location;
        pauseAudio();
        setChordRepetitions((prev) =>
          prev.length > 0 ? new Array(prev.length).fill(0) : prev,
        );
        void playTab({ location });
      }
    }

    orientationBucketRef.current = getOrientationBucket();
    handleMeasurePulse();

    const modalElement = modalContentRef.current;
    let resizeObserver: ResizeObserver | null = null;

    if (modalElement && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        // Some mobile browsers only surface orientation via resize/RO with new
        // aspect ratio — treat portrait↔landscape flips the same as
        // orientationchange.
        handleOrientationBucketChange();
      });
      resizeObserver.observe(modalElement);
    }

    window.addEventListener("resize", handleOrientationBucketChange);
    window.addEventListener("orientationchange", handleOrientationChangeEvent);
    document.addEventListener("visibilitychange", handleVisibilityResume);
    window.addEventListener("pageshow", handleVisibilityResume);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleOrientationBucketChange);
      window.removeEventListener(
        "orientationchange",
        handleOrientationChangeEvent,
      );
      document.removeEventListener("visibilitychange", handleVisibilityResume);
      window.removeEventListener("pageshow", handleVisibilityResume);

      if (measureRetryRafRef.current !== null) {
        cancelAnimationFrame(measureRetryRafRef.current);
        measureRetryRafRef.current = null;
      }
    };
  }, [
    expandedTabData,
    showPlaybackModal,
    containerElement,
    playbackModalViewingState,
    measurePlaybackContainer,
    scheduleMeasureRetry,
    audioMetadata.playing,
    audioMetadata.location,
    pauseAudio,
    playTab,
  ]);

  // Reset playback-modal-owned defaults on close so the next open remeasures
  // and recompiles from a clean width instead of a stale orientation/tab size.
  useEffect(() => {
    return () => {
      setPlaybackModalViewingState("Practice");
      setCurrentChordIndex(0);
      setVisiblePlaybackContainerWidth(0);
    };
  }, [
    setPlaybackModalViewingState,
    setCurrentChordIndex,
    setVisiblePlaybackContainerWidth,
  ]);

  const currentChordRepetition = chordRepetitions[currentChordIndex] ?? 0;

  // Keep the inline transform at the current chord boundary.
  // While playing, WAAPI owns motion. While paused, this preserves the existing settle/scrub path.
  const scrollContainerTransform = useMemo(() => {
    if (
      !chordLayoutData ||
      !expandedTabData ||
      !currentlyPlayingMetadata ||
      chordRepetitions.length === 0
    ) {
      return "translateX(0px)";
    }

    const { scrollPositions, totalWidth } = chordLayoutData;
    const position =
      (scrollPositions[currentChordIndex] ?? 0) +
      (chordRepetitions[currentChordIndex] ?? 0) * totalWidth;

    return `translateX(${position * -1}px)`;
  }, [
    chordLayoutData,
    expandedTabData,
    currentlyPlayingMetadata,
    currentChordIndex,
    chordRepetitions,
  ]);

  const renderVisibleChord = useCallback(
    ({
      chord,
      prevChord,
      nextChord,
      isFirstChordInSection,
      isDimmed,
      isHighlighted,
    }: RenderVisibleChord) => (
      <RenderChordByType
        type={
          chord.type === "strum"
            ? "strum"
            : chord.type === "tab"
              ? chord.data.chordData.includes("|")
                ? "measureLine"
                : "tab"
              : "loopDelaySpacer"
        }
        playbackSpeed={playbackSpeed}
        prevChord={prevChord}
        chord={chord}
        nextChord={nextChord}
        isFirstChordInSection={isFirstChordInSection}
        isDimmed={isDimmed}
        loopDelay={loopDelay}
        isHighlighted={isHighlighted}
      />
    ),
    [loopDelay, playbackSpeed],
  );

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
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          closePlaybackModal();
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
                className="absolute left-0 top-0 z-10 size-full bg-black/40 backdrop-blur-sm"
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
                        <PlaybackAnimatedStrip
                          chordLayoutData={chordLayoutData}
                          playing={audioMetadata.playing}
                          currentChordIndex={currentChordIndex}
                          scrollContainerTransform={scrollContainerTransform}
                          currentRepetition={currentChordRepetition}
                          initialPlaceholderWidth={initialPlaceholderWidth}
                          expandedTabData={expandedTabData}
                          chordRepetitions={chordRepetitions}
                          loopDelay={loopDelay}
                          playbackSpeed={playbackSpeed}
                          renderChord={renderVisibleChord}
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

          <Button variant={"modalClose"} onClick={closePlaybackModal}>
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default PlaybackModal;

interface RenderChordByTypeProps {
  type: "tab" | "measureLine" | "strum" | "loopDelaySpacer";
  playbackSpeed: number;
  prevChord?:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
  chord:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
  nextChord?:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
  isFirstChordInSection: boolean;
  isDimmed: boolean;
  loopDelay: number;
  isHighlighted: boolean;
}

const RenderChordByType = memo(function RenderChordByType({
  type,
  playbackSpeed,
  prevChord,
  chord,
  nextChord,
  isFirstChordInSection,
  isDimmed,
  loopDelay,
  isHighlighted,
}: RenderChordByTypeProps) {
  const prevChordNoteLength = prevChord
    ? prevChord.type === "strum" && !prevChord.isLastChord // don't want to have separate strumming patterns' note length guides be connected
      ? prevChord.data.noteLength
      : prevChord.type === "tab"
        ? (prevChord.data.chordData[8] as FullNoteLengths)
        : undefined
    : undefined;

  const currentChordNoteLength = chord
    ? chord.type === "strum"
      ? chord.data.noteLength
      : chord.type === "tab"
        ? (chord.data.chordData[8] as FullNoteLengths)
        : undefined
    : undefined;

  const nextChordNoteLength = nextChord
    ? nextChord.type === "strum" &&
      (chord.type !== "strum" || !chord.isLastChord) // don't want to have separate strumming patterns' note length guides be connected
      ? nextChord.data.noteLength
      : nextChord.type === "tab"
        ? (nextChord.data.chordData[8] as FullNoteLengths)
        : undefined
    : undefined;

  const prevChordIsRest =
    prevChord === undefined ||
    (prevChord.type === "tab" && prevChord.data.chordData[7] === "r") ||
    (prevChord.type === "strum" && prevChord.data.strum === "r");
  const currentChordIsRest =
    chord === undefined ||
    (chord.type === "tab" && chord.data.chordData[7] === "r") ||
    (chord.type === "strum" && chord.data.strum === "r");
  const nextChordIsRest =
    nextChord === undefined ||
    (nextChord.type === "tab" && nextChord.data.chordData[7] === "r") ||
    (nextChord.type === "strum" && nextChord.data.strum === "r");

  if (type === "tab" && chord?.type === "tab") {
    return (
      <PlaybackTabChord
        columnData={chord?.data.chordData}
        isFirstChordInSection={isFirstChordInSection}
        isLastChordInSection={chord?.isLastChord && loopDelay !== 0}
        isHighlighted={isHighlighted}
        isDimmed={isDimmed}
        prevChordNoteLength={prevChordNoteLength}
        currentChordNoteLength={currentChordNoteLength}
        nextChordNoteLength={nextChordNoteLength}
        prevChordIsRest={prevChordIsRest}
        currentChordIsRest={currentChordIsRest}
        nextChordIsRest={nextChordIsRest}
      />
    );
  }

  if (type === "measureLine" && chord?.type === "tab") {
    return (
      <PlaybackTabMeasureLine
        columnData={chord.data.chordData}
        isDimmed={isDimmed}
      />
    );
  }

  if (type === "strum" && chord?.type === "strum") {
    return (
      <PlaybackStrummedChord
        strumIndex={chord?.data.strumIndex || 0}
        strum={chord?.data.strum || ""}
        palmMute={chord?.data.palmMute || ""}
        isFirstChordInSection={isFirstChordInSection}
        isLastChordInSection={chord?.isLastChord && loopDelay !== 0}
        noteLength={chord?.data.noteLength || "quarter"}
        bpmToShow={chord?.data.showBpm ? chord?.data.bpm : undefined}
        chordName={chord?.data.chordName || ""}
        chordColor={chord?.data.chordColor || ""}
        isHighlighted={isHighlighted}
        beatIndicator={chord?.data.beatIndicator}
        isDimmed={isDimmed}
        prevChordNoteLength={prevChordNoteLength}
        currentChordNoteLength={currentChordNoteLength}
        nextChordNoteLength={nextChordNoteLength}
        prevChordIsRest={prevChordIsRest}
        currentChordIsRest={currentChordIsRest}
        nextChordIsRest={nextChordIsRest}
      />
    );
  }

  if (type === "loopDelaySpacer") {
    return <div className="absolute left-0 h-full w-[34px]"></div>;
  }
});
