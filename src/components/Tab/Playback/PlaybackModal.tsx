import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import PlaybackAudioControls from "~/components/Tab/Playback/PlaybackAudio/PlaybackAudioControls";
import PlaybackBottomMetadata from "~/components/Tab/Playback/PlaybackBottomMetadata";
import PlaybackLoopRangeActions from "~/components/Tab/Playback/PlaybackLoopRangeActions";
import PlaybackStrummedChord from "~/components/Tab/Playback/PlaybackStrummedChord";
import PlaybackTabChord from "~/components/Tab/Playback/PlaybackTabChord";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTopMetadata from "~/components/Tab/Playback/PlaybackTopMetadata";
import { AnimatePresence, motion } from "framer-motion";
import { FocusTrap } from "focus-trap-react";
import { useIPhoneSoundDrawerStore } from "~/stores/IPhoneSoundDrawerStore";
import {
  type PlaybackTabChord as PlaybackTabChordType,
  type PlaybackStrummedChord as PlaybackStrummedChordType,
  type PlaybackLoopDelaySpacerChord,
  useTabStoreApi,
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
  type PlaybackChordLayoutData,
} from "~/utils/playbackModalLayout";
import {
  getLoopRangePrompt,
  getLoopRangeSelectionStep,
} from "~/utils/loopRangeHelpers";
import { beamBreaksForPlaybackIndex } from "~/utils/noteLengthBeaming";

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
  isFirstChordInTab: boolean;
  isLastChordInTab: boolean;
  isDimmed: boolean;
  isHighlighted: boolean;
}

export interface PlaybackPracticeControls {
  chordDurations: number[];
  setChordRepetitions: Dispatch<SetStateAction<number[]>>;
  scrollPositionsLength: number;
  isGlideScrubbing: boolean;
  loopRangePrompt: string | null;
}

type PlaybackModalProps =
  | { presentation?: "modal" }
  | {
      presentation: "embedded";
      renderControls: (controls: PlaybackPracticeControls) => ReactNode;
    };

function PlaybackModal(props: PlaybackModalProps = {}) {
  const soundDrawerOpen = useIPhoneSoundDrawerStore((state) => state.open);
  const store = useTabStoreApi();
  const {
    currentChordIndex,
    expandedTabData,
    playbackSpeed,
    playbackMetadata,
    audioMetadata,
    showPlaybackModal,
    visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth,
    playbackModalViewingState,
    viewportLabel,
    loopDelay,
    currentlyPlayingMetadata,
    pauseAudio,
    setCurrentChordIndex,
    reanchorPlaybackStripAnimation,
    resetPlaybackModalSession,
    draftLoopStartIndex,
    draftLoopEndIndex,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    expandedTabData: state.expandedTabData,
    playbackSpeed: state.playbackSpeed,
    playbackMetadata: state.playbackMetadata,
    audioMetadata: state.audioMetadata,
    showPlaybackModal: state.showPlaybackModal,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
    setVisiblePlaybackContainerWidth: state.setVisiblePlaybackContainerWidth,
    playbackModalViewingState: state.playbackModalViewingState,
    viewportLabel: state.viewportLabel,
    loopDelay: state.loopDelay,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    pauseAudio: state.pauseAudio,
    setCurrentChordIndex: state.setCurrentChordIndex,
    reanchorPlaybackStripAnimation: state.reanchorPlaybackStripAnimation,
    resetPlaybackModalSession: state.resetPlaybackModalSession,
    draftLoopStartIndex: state.draftLoopStartIndex,
    draftLoopEndIndex: state.draftLoopEndIndex,
  }));

  // Always track the latest strip container — a one-shot ref goes stale when
  // AnimatePresence remounts the Practice view after switching modal tabs.
  const containerRef = (element: HTMLDivElement | null) => {
    setContainerElement(element);
  };
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const playbackStripRef = useRef<HTMLDivElement | null>(null);
  const playbackPlayheadRef = useRef<HTMLDivElement | null>(null);
  const scrubPositionRef = useRef(0);
  const measureRetryRafRef = useRef<number | null>(null);
  const wasDocumentHiddenRef = useRef(false);
  // Refs so background/foreground handlers never read a stale playing flag
  // from an effect closure (iOS can fire pagehide during a playing session
  // without re-running the listener effect first).
  const playingRef = useRef(audioMetadata.playing);
  const showPlaybackModalRef = useRef(showPlaybackModal);
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

  // Uniform repetition anchors playback/resume. The visible window mounts
  // adjacent loop copies independently of this scheduler-polled state.
  const [chordRepetitions, setChordRepetitions] = useState<number[]>([]);

  // Temporary: glide scrub mode takes imperative ownership of strip translateX.
  const [isGlideScrubbing, setIsGlideScrubbing] = useState(false);

  const [tabProgressValue, setTabProgressValue] = useState(0);

  const loopRangePrompt = audioMetadata.editingLoopRange
    ? getLoopRangePrompt(
        getLoopRangeSelectionStep(draftLoopStartIndex, draftLoopEndIndex),
      )
    : null;

  useModalScrollbarHandling(true, props.presentation !== "embedded");

  useEffect(() => {
    playingRef.current = audioMetadata.playing;
  }, [audioMetadata.playing]);

  useEffect(() => {
    showPlaybackModalRef.current = showPlaybackModal;
  }, [showPlaybackModal]);

  useEffect(() => {
    if (props.presentation === "embedded") return;
    const html = document.documentElement;
    html.classList.add("disablePullToRefresh");

    return () => {
      html.classList.remove("disablePullToRefresh");
    };
  }, [props.presentation]);

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

    if (audioMetadata.playing && showPlaybackModal) {
      reanchorPlaybackStripAnimation();
    }
  }, [
    expandedTabData,
    currentChordIndex,
    audioMetadata.playing,
    audioMetadata.editingLoopRange,
    showPlaybackModal,
    setCurrentChordIndex,
    reanchorPlaybackStripAnimation,
  ]);

  function closePlaybackModal() {
    // Must not spread a stale audioMetadata.playing:true after pauseAudio —
    // that resurrected playing without a scheduler and made the strip scroll
    // on the next open with no audio.
    resetPlaybackModalSession();
  }

  // React Compiler escape hatch: stable identity so PlaybackAnimatedStrip's
  // custom memo and the strip animation effect do not thrash on every parent render.
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

  // Only the audio scheduler advances this anchor. Scrubbing owns absolute
  // position (and repetition) until release; no forward half-shift can fight it.
  useLayoutEffect(() => {
    const previousChordIndex = prevChordIndexRef.current;
    prevChordIndexRef.current = currentChordIndex;
    if (
      audioMetadata.playing &&
      !isGlideScrubbing &&
      currentChordIndex < previousChordIndex
    ) {
      setChordRepetitions((previous) =>
        new Array<number>(previous.length).fill((previous[0] ?? 0) + 1),
      );
    }
  }, [currentChordIndex, audioMetadata.playing, isGlideScrubbing]);

  // Measure modal width on mount/resize/orientation/visibility. Zero-size
  // frames (common mid-orientation on mobile) schedule rAF retries.
  // Portrait↔landscape while playing pauses playback for a stable re-layout.
  useEffect(() => {
    function measurePlaybackContainer() {
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
    }

    function scheduleMeasureRetry() {
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
    }

    function getOrientationBucket(): "portrait" | "landscape" {
      return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
    }

    function pauseForOrientationChange() {
      if (!playingRef.current || !showPlaybackModalRef.current) {
        return;
      }

      // Keep currentChordIndex so the user can resume from the same spot after
      // the modal settles in the new orientation.
      pauseAudio();
      setChordRepetitions((prev) =>
        prev.length > 0 ? Array.from({ length: prev.length }, () => 0) : prev,
      );
    }

    function pauseForBackgrounding() {
      if (!showPlaybackModalRef.current) {
        return;
      }

      setChordRepetitions((prev) =>
        prev.length > 0 ? Array.from({ length: prev.length }, () => 0) : prev,
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

    function handleDocumentHidden() {
      wasDocumentHiddenRef.current = true;
      pauseForBackgrounding();
    }

    function handleDocumentVisible() {
      if (!wasDocumentHiddenRef.current) {
        return;
      }
      wasDocumentHiddenRef.current = false;

      // Remeasure after app-switch / bfcache restore, and reset strip loop
      // offsets so the next Play handoff starts from a clean React-owned
      // translateX at currentChordIndex.
      handleMeasurePulse();
      setChordRepetitions((prev) =>
        prev.length > 0 ? Array.from({ length: prev.length }, () => 0) : prev,
      );
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
    const unsubscribeAudio = store
      .getState()
      .subscribeAudioLifecycle((event) => {
        if (event === "background") handleDocumentHidden();
        else if (event === "foreground") handleDocumentVisible();
      });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleOrientationBucketChange);
      window.removeEventListener(
        "orientationchange",
        handleOrientationChangeEvent,
      );
      unsubscribeAudio();

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
    pauseAudio,
    setVisiblePlaybackContainerWidth,
    store,
  ]);

  // Reset all playback-modal / strip-clock state on unmount so any close path
  // (X button, route change, exercise switch) cannot leave playing=true or a
  // live playbackStartedAtAudioTime for the next open.
  useEffect(() => {
    return () => {
      resetPlaybackModalSession();
    };
  }, [resetPlaybackModalSession]);

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

  // React Compiler escape hatch: stable renderChord identity for the strip memo.
  const renderVisibleChord = useCallback(
    ({
      chord,
      index,
      prevChord,
      nextChord,
      isFirstChordInTab,
      isLastChordInTab,
      isDimmed,
      isHighlighted,
    }: RenderVisibleChord) => {
      const beamBreaks = beamBreaksForPlaybackIndex(
        expandedTabData ?? [],
        index,
      );

      return (
        <RenderChordByType
          key={loopDelay}
          type={
            chord.type === "strum"
              ? "strum"
              : chord.type === "tab"
                ? chord.data.chordData.includes("|")
                  ? "measureLine"
                  : "tab"
                : "loopDelaySpacer"
          }
          chordIndex={index}
          prevChord={prevChord}
          chord={chord}
          nextChord={nextChord}
          isFirstChordInTab={isFirstChordInTab}
          isLastChordInTab={isLastChordInTab}
          isDimmed={isDimmed}
          isHighlighted={isHighlighted}
          breakBeamWithPrevious={beamBreaks.breakWithPrevious}
          breakBeamWithNext={beamBreaks.breakWithNext}
        />
      );
    },
    [loopDelay, expandedTabData],
  );

  const practiceStrip = (
    <div className="w-full overflow-hidden">
      <PlaybackScrollingContainer
        setChordRepetitions={setChordRepetitions}
        chordLayoutData={chordLayoutData}
        chordRepetitions={chordRepetitions}
        stripRef={playbackStripRef}
        scrubPositionRef={scrubPositionRef}
        playheadRef={playbackPlayheadRef}
        isGlideScrubbing={isGlideScrubbing}
        setIsGlideScrubbing={setIsGlideScrubbing}
      >
        <div
          ref={containerRef}
          className="relative flex h-[var(--playback-practice-strip-height,315px)] w-full overflow-hidden"
        >
          {!audioMetadata.editingLoopRange && (
            <div className="baseFlex absolute left-0 top-0 size-full">
              <div className="h-[150px] w-full"></div>
              <div
                ref={playbackPlayheadRef}
                className="z-0 mb-[2px] ml-1 h-[124px] w-[2px] shrink-0 bg-primary will-change-transform"
              ></div>
              <div className="h-[150px] w-full"></div>
            </div>
          )}

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
              isGlideScrubbing={isGlideScrubbing}
              scrubPositionRef={scrubPositionRef}
              stripRef={playbackStripRef}
              renderChord={renderVisibleChord}
            />
          )}
        </div>
      </PlaybackScrollingContainer>
    </div>
  );

  if (props.presentation === "embedded") {
    return (
      <div
        ref={modalContentRef}
        className="playbackModalGradient w-full select-none overflow-hidden rounded-lg border"
        data-playback-example
      >
        {practiceStrip}
        {props.renderControls({
          chordDurations: chordLayoutData?.durations ?? [],
          setChordRepetitions,
          scrollPositionsLength: chordLayoutData?.scrollPositions.length ?? 0,
          isGlideScrubbing,
          loopRangePrompt,
        })}
      </div>
    );
  }

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
        paused={soundDrawerOpen || showBackgroundBlur}
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
                {practiceStrip}
              </motion.div>
            )}

            {!viewportLabel.includes("mobile") && <PlaybackMenuContent />}
          </AnimatePresence>

          {playbackModalViewingState === "Practice" && (
            <div className="baseVertFlex w-full lg:gap-2 mobilePortrait:gap-1">
              <PlaybackAudioControls
                chordDurations={chordLayoutData?.durations ?? []}
                tabProgressValue={tabProgressValue}
                setTabProgressValue={setTabProgressValue}
                setChordRepetitions={setChordRepetitions}
                scrollPositionsLength={
                  chordLayoutData?.scrollPositions.length ?? 0
                }
                isGlideScrubbing={isGlideScrubbing}
                loopRangePrompt={loopRangePrompt}
              />

              {audioMetadata.editingLoopRange ? (
                <PlaybackLoopRangeActions />
              ) : (
                <PlaybackBottomMetadata
                  tabProgressValue={tabProgressValue}
                  setTabProgressValue={setTabProgressValue}
                  showBackgroundBlur={showBackgroundBlur}
                  setShowBackgroundBlur={setShowBackgroundBlur}
                />
              )}
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

interface RenderChordByType {
  type: "tab" | "measureLine" | "strum" | "loopDelaySpacer";
  chordIndex: number;
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
  isFirstChordInTab: boolean;
  isLastChordInTab: boolean;
  isDimmed: boolean;
  isHighlighted: boolean;
  breakBeamWithPrevious: boolean;
  breakBeamWithNext: boolean;
}

function isPlaybackTabMeasureLine(
  playbackChord:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord
    | undefined,
): boolean {
  return (
    playbackChord?.type === "tab" &&
    (playbackChord.data.chordData.includes("|") ||
      playbackChord.data.chordData[8] === "measureLine")
  );
}

function getTabChordNoteLength(
  playbackChord: PlaybackTabChordType,
): FullNoteLengths | undefined {
  if (isPlaybackTabMeasureLine(playbackChord)) {
    return undefined;
  }

  return playbackChord.data.chordData[8] as FullNoteLengths;
}

function RenderChordByType({
  type,
  chordIndex,
  prevChord,
  chord,
  nextChord,
  isFirstChordInTab,
  isLastChordInTab,
  isDimmed,
  isHighlighted,
  breakBeamWithPrevious,
  breakBeamWithNext,
}: RenderChordByType) {
  const prevChordNoteLength = prevChord
    ? prevChord.type === "strum" && !prevChord.isLastChord // don't want to have separate strumming patterns' note length guides be connected
      ? prevChord.data.noteLength
      : prevChord.type === "tab"
        ? getTabChordNoteLength(prevChord)
        : undefined
    : undefined;

  const currentChordNoteLength = chord
    ? chord.type === "strum"
      ? chord.data.noteLength
      : chord.type === "tab"
        ? getTabChordNoteLength(chord)
        : undefined
    : undefined;

  const nextChordNoteLength = nextChord
    ? nextChord.type === "strum" &&
      (chord.type !== "strum" || !chord.isLastChord) // don't want to have separate strumming patterns' note length guides be connected
      ? nextChord.data.noteLength
      : nextChord.type === "tab"
        ? getTabChordNoteLength(nextChord)
        : undefined
    : undefined;

  const prevIsMeasureLine = isPlaybackTabMeasureLine(prevChord);
  const nextIsMeasureLine = isPlaybackTabMeasureLine(nextChord);

  // Match StaticTabNotesColumn / useTabColumnNeighborMeta: measure lines break beam groups
  const isFirstChord =
    (chord.type === "tab" || chord.type === "strum"
      ? chord.isFirstChord
      : false) || prevIsMeasureLine;
  const isLastChord =
    (chord.type === "tab" || chord.type === "strum"
      ? chord.isLastChord
      : false) || nextIsMeasureLine;

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
        chordIndex={chordIndex}
        isFirstChord={isFirstChord}
        isLastChord={isLastChord}
        isFirstChordInTab={isFirstChordInTab}
        isLastChordInTab={isLastChordInTab}
        isHighlighted={isHighlighted}
        isDimmed={isDimmed}
        prevChordNoteLength={prevChordNoteLength}
        currentChordNoteLength={currentChordNoteLength}
        nextChordNoteLength={nextChordNoteLength}
        prevChordIsRest={prevChordIsRest}
        currentChordIsRest={currentChordIsRest}
        nextChordIsRest={nextChordIsRest}
        breakBeamWithPrevious={breakBeamWithPrevious}
        breakBeamWithNext={breakBeamWithNext}
        showBpm={chord.data.showBpm}
      />
    );
  }

  if (type === "measureLine" && chord?.type === "tab") {
    return (
      <PlaybackTabMeasureLine
        columnData={chord.data.chordData}
        chordIndex={chordIndex}
        isDimmed={isDimmed}
        showBpm={chord.data.showBpm}
        bpmToShow={chord.data.showBpm ? chord.data.bpm : undefined}
      />
    );
  }

  if (type === "strum" && chord?.type === "strum") {
    return (
      <PlaybackStrummedChord
        strum={chord?.data.strum || ""}
        chordIndex={chordIndex}
        palmMute={chord?.data.palmMute || ""}
        isFirstChord={isFirstChord}
        isLastChord={isLastChord}
        isFirstChordInTab={isFirstChordInTab}
        isLastChordInTab={isLastChordInTab}
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
        breakBeamWithPrevious={breakBeamWithPrevious}
        breakBeamWithNext={breakBeamWithNext}
      />
    );
  }

  if (type === "loopDelaySpacer") {
    return <div className="absolute left-0 h-full w-[34px]"></div>;
  }
}
