import { Fragment, useEffect, useRef, useState } from "react";
import PlaybackAudioControls from "~/components/Tab/Playback/PlaybackAudio/PlaybackAudioControls";
import PlaybackBottomMetadata from "~/components/Tab/Playback/PlaybackBottomMetadata";
import PlaybackStrummedChord from "~/components/Tab/Playback/PlaybackStrummedChord";
import PlaybackTabChord from "~/components/Tab/Playback/PlaybackTabChord";
import PlaybackTabMeasureLine from "~/components/Tab/Playback/PlaybackTabMeasureLine";
import PlaybackTopMetadata from "~/components/Tab/Playback/PlaybackTopMetadata";
import { AnimatePresence, motion } from "framer-motion";
import { FocusTrap } from "focus-trap-react";
import {
  type AudioMetadata,
  type PlaybackTabChord as PlaybackTabChordType,
  type PlaybackStrummedChord as PlaybackStrummedChordType,
  type PlaybackLoopDelaySpacerChord,
  useTabStore,
} from "~/stores/TabStore";
import PlaybackMenuContent from "~/components/Tab/Playback/PlaybackMenuContent";
import PlaybackScrollingContainer from "~/components/Tab/Playback/PlaybackScrollingContainer";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { v4 as randomUUID } from "uuid"; // FYI: crypto randomUUID() wasn't working for whatever reason

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface ScrollPositions {
  byId: {
    [id: string]: {
      originalPosition: number;
      currentPosition: number | null;
    };
  };
  allIds: string[];
}

function PlaybackModal() {
  const {
    expandedTabData,
    currentChordIndex,
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
    setAudioMetadata,
    setPlaybackModalViewingState,
    pauseAudio,
    setPreventFramerLayoutShift,
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
    setAudioMetadata: state.setAudioMetadata,
    setPlaybackModalViewingState: state.setPlaybackModalViewingState,
    pauseAudio: state.pauseAudio,
    setPreventFramerLayoutShift: state.setPreventFramerLayoutShift,
  }));

  const containerRef = (element: HTMLDivElement | null) => {
    if (element && !containerElement) setContainerElement(element);
  };
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);

  const [chordDurations, setChordDurations] = useState<number[]>([]);
  const [initialPlaceholderWidth, setInitialPlaceholderWidth] = useState(0);

  const [chordWidths, setChordWidths] = useState<number[]>([]);
  const [finalChordWidth, setFinalChordWidth] = useState(0); // used so we don't need to pass entire chordWidths
  // into the effect to get new currentPosition values
  const [scrollPositions, setScrollPositions] =
    useState<ScrollPositions | null>(null);
  const scrollPositionsRef = useRef<ScrollPositions | null>(null);

  const earliestVisibleChordIndexRef = useRef<number>(0);

  const [scrollContainerWidth, setScrollContainerWidth] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const prevCurrentChordIndexRef = useRef<number | null>(null);

  // below two are just here to avoid polluting the store with these extra semi-local values
  const [loopRange, setLoopRange] = useState<[number, number]>([
    audioMetadata.startLoopIndex,
    audioMetadata.endLoopIndex === -1
      ? audioMetadata.fullCurrentlyPlayingMetadataLength - 1
      : audioMetadata.endLoopIndex,
  ]);
  const [tabProgressValue, setTabProgressValue] = useState(0);

  // gates computation of chord widths + positions + duplication to only when
  // expandedTabData has changed or looping has changed
  const [expandedTabDataHasChanged, setExpandedTabDataHasChanged] =
    useState(true);

  useEffect(() => {
    setPreventFramerLayoutShift(true);

    setTimeout(() => {
      const offsetY = window.scrollY;
      document.body.style.top = `${-offsetY}px`;
      document.body.classList.add("noScroll");
    }, 50);

    return () => {
      setPreventFramerLayoutShift(false);

      setTimeout(() => {
        const offsetY = Math.abs(
          parseInt(`${document.body.style.top || 0}`, 10),
        );
        document.body.classList.remove("noScroll");
        document.body.style.removeProperty("top");
        window.scrollTo(0, offsetY || 0);
      }, 50);
    };
  }, [setPreventFramerLayoutShift]);

  useEffect(() => {
    // this feels a bit like a bandaid fix
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

  useEffect(() => {
    if (scrollPositions === null) return;

    const currentScrollPosition = getScrollPosition({
      scrollPositions,
      index: currentChordIndex,
    });

    const prevScrollPosition =
      prevCurrentChordIndexRef.current !== null
        ? getScrollPosition({
            scrollPositions,
            index: prevCurrentChordIndexRef.current,
          })
        : null;

    if (
      prevCurrentChordIndexRef.current !== null &&
      prevScrollPosition !== null &&
      prevCurrentChordIndexRef.current > currentChordIndex &&
      prevScrollPosition < currentScrollPosition
    ) {
      setLoopCount((prev) => prev + 1);
    } else if (
      prevCurrentChordIndexRef.current !== null && // Ensure it's not the initial render
      prevCurrentChordIndexRef.current > currentChordIndex && // User scrolled backward
      !audioMetadata.playing // Playback is not active
    ) {
      // Reset all currentPosition to null
      setScrollPositions((prev) => {
        if (prev === null) return null;

        const newById = { ...prev.byId };

        Object.keys(newById).forEach((itemId) => {
          newById[itemId] = {
            ...newById[itemId]!, // this should be safe to assert
            currentPosition: null,
          };
        });

        return {
          ...prev,
          byId: newById,
        };
      });

      if (loopCount > 0) {
        setLoopCount(0);
      }

      earliestVisibleChordIndexRef.current = 0;
    }

    // Update previous value refs
    prevCurrentChordIndexRef.current = currentChordIndex;
  }, [currentChordIndex, audioMetadata.playing, scrollPositions, loopCount]);

  useEffect(() => {
    scrollPositionsRef.current = scrollPositions;
  }, [scrollPositions]);

  useEffect(() => {
    if (scrollPositionsRef.current === null) return;

    // value is the new scrollPosition to update currentPosition to
    const updates: { [itemId: string]: number } = {};

    const earliestVisiblePosition =
      getScrollPosition({
        scrollPositions: scrollPositionsRef.current,
        index: currentChordIndex,
      }) +
      initialPlaceholderWidth -
      visiblePlaybackContainerWidth * 0.5 -
      100; // 100 is buffer value

    let localIndex = earliestVisibleChordIndexRef.current;

    while (true) {
      const position =
        getScrollPosition({
          scrollPositions: scrollPositionsRef.current,
          index: localIndex,
        }) + initialPlaceholderWidth;

      if (position < earliestVisiblePosition) {
        const id = scrollPositionsRef.current.allIds[localIndex] || 0;
        updates[id] =
          position -
          initialPlaceholderWidth +
          scrollContainerWidth +
          finalChordWidth;
      } else {
        break;
      }

      if (localIndex + 1 >= scrollPositionsRef.current.allIds.length) {
        localIndex = 0;
      } else {
        localIndex++;
      }
    }

    if (Object.keys(updates).length === 0) return;

    setScrollPositions((prev) => {
      if (prev === null) return null;

      const newById = { ...prev.byId };

      for (const [id, currentPosition] of Object.entries(updates)) {
        newById[id] = {
          ...newById[id]!, // this should be safe to assert
          currentPosition,
        };
      }

      return {
        ...prev,
        byId: newById,
      };
    });

    earliestVisibleChordIndexRef.current = localIndex;
  }, [
    currentChordIndex,
    scrollContainerWidth,
    visiblePlaybackContainerWidth,
    initialPlaceholderWidth,
    finalChordWidth,
  ]);

  // TODO: is this necessary?
  useEffect(() => {
    setExpandedTabDataHasChanged(true);
  }, [expandedTabData]);

  useEffect(() => {
    if (
      !expandedTabDataHasChanged ||
      !containerElement ||
      !expandedTabData ||
      !playbackMetadata ||
      visiblePlaybackContainerWidth === 0 ||
      expandedTabData.length === 0
    )
      return;

    const localScrollPositions: typeof scrollPositions = {
      byId: {},
      allIds: [],
    };
    const chordWidths: number[] = [];
    let finalElementWidth = 0;
    let offsetLeft = 0;

    expandedTabData.map((chord, index) => {
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
            ? 35
            : 40;

      const id = randomUUID();

      localScrollPositions.byId[id] = {
        originalPosition: offsetLeft,
        currentPosition: null,
      };

      localScrollPositions.allIds.push(id);

      chordWidths.push(chordWidth);

      if (index === expandedTabData.length - 1) {
        finalElementWidth = chordWidth;
      }

      offsetLeft += chordWidth;
    });

    const durations = playbackMetadata.map((metadata) => {
      const { bpm, noteLengthMultiplier } = metadata;
      return 60 / ((bpm / Number(noteLengthMultiplier)) * playbackSpeed);
    });

    const lastChordId = localScrollPositions.allIds.at(-1);

    let scrollContainerWidth =
      localScrollPositions.byId[lastChordId || 0]?.originalPosition ||
      0 + finalElementWidth;

    setExpandedTabDataHasChanged(false);
    setTimeout(() => {
      setScrollPositions(localScrollPositions);
      setChordWidths(chordWidths);
      setScrollContainerWidth(scrollContainerWidth);
      setChordDurations(durations);
      setFinalChordWidth(finalElementWidth);
    }, 1000); // TODO: this is a bandaid fix. this looks to be a syncing issue with zustand state updates, should be fixed in react 19/next 15 though
  }, [
    containerElement,
    visiblePlaybackContainerWidth,
    expandedTabData,
    expandedTabDataHasChanged,
    chordDurations,
    playbackMetadata,
    playbackSpeed,
  ]);

  function chordIsVisible(index: number) {
    if (scrollPositions === null) return false;

    const chordPosition = getScrollPosition({ scrollPositions, index });
    const currentPosition = getScrollPosition({
      scrollPositions,
      index: currentChordIndex,
    });

    const minVisiblePosition =
      currentPosition - visiblePlaybackContainerWidth / 2 - 100;
    const maxVisiblePosition =
      currentPosition + visiblePlaybackContainerWidth / 2 + 100;

    return (
      chordPosition >= minVisiblePosition && chordPosition <= maxVisiblePosition
    );
  }

  function highlightChord({
    chordIndex,
    type,
  }: {
    chordIndex: number;
    type: "isBeingPlayed" | "hasBeenPlayed";
  }) {
    if (scrollPositions === null) return false;

    const scrollPosition = getScrollPosition({
      scrollPositions,
      index: chordIndex,
    });
    const startPositionOfCurrentLoop = scrollContainerWidth * (loopCount + 1);

    if (
      scrollPosition === undefined ||
      scrollPosition >= startPositionOfCurrentLoop
    ) {
      return false;
    }

    return type === "isBeingPlayed"
      ? currentChordIndex === chordIndex
      : currentChordIndex >= chordIndex + 1;
  }

  return (
    <motion.div
      key={"PlaybackModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowPlaybackModal(false);
          pauseAudio(true);
          setPlaybackModalViewingState("Practice");
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
          allowOutsideClick: true,
          initialFocus: false,
        }}
      >
        <div
          ref={modalContentRef}
          className="baseVertFlex relative h-dvh w-screen max-w-none !justify-between gap-0 !rounded-none bg-black p-0 narrowMobileLandscape:!justify-center tablet:h-[650px] tablet:max-w-6xl tablet:!rounded-lg"
        >
          <PlaybackTopMetadata
            tabProgressValue={tabProgressValue}
            setTabProgressValue={setTabProgressValue}
          />

          <AnimatePresence mode="popLayout">
            {playbackModalViewingState === "Practice" && (
              <motion.div
                key="PracticeTab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="baseVertFlex relative size-full select-none"
              >
                <div
                  style={{
                    mask: "linear-gradient(90deg, transparent, white 5%, white 95%, transparent)",
                  }}
                  className="w-full overflow-hidden"
                >
                  <PlaybackScrollingContainer loopCount={loopCount}>
                    <div
                      ref={containerRef}
                      className="relative flex h-[247px] w-full overflow-hidden mobilePortrait:h-[267px]"
                    >
                      <div className="baseFlex absolute left-0 top-0 size-full">
                        <div className="mb-6 h-[140px] w-full mobilePortrait:h-[165px]"></div>
                        {/* currently this fixes the highlight line extending past rounded borders of
                        sections, but puts it behind measure lines. maybe this is a fine tradeoff? */}
                        <div className="z-0 mb-6 ml-2 h-[140px] w-[2px] shrink-0 bg-pink-600 mobilePortrait:h-[164px]"></div>
                        <div className="mb-6 h-[140px] w-full mobilePortrait:h-[165px]"></div>
                      </div>

                      {scrollPositions && expandedTabData && (
                        <div
                          style={{
                            width: `${scrollContainerWidth}px`,
                            transform: getScrollContainerTransform({
                              scrollPositions,
                              currentChordIndex,
                              audioMetadata,
                              numberOfChords: playbackMetadata?.length || 0,
                            }),
                            transition: `transform ${
                              audioMetadata.playing
                                ? chordDurations[currentChordIndex] || 0
                                : 0.2
                            }s linear`,
                          }}
                          className="relative flex items-center will-change-transform"
                        >
                          <div
                            style={{
                              position: "absolute",
                              zIndex: 2,
                              backgroundColor: "black",
                              left: 0,
                              width: `${initialPlaceholderWidth}px`,
                            }}
                          ></div>

                          {expandedTabData.map((chord, index) => (
                            <Fragment key={index}>
                              {chordIsVisible(index) && (
                                <div
                                  style={{
                                    position: "absolute",
                                    width: `${chordWidths[index] || 0}px`,
                                    left: `${
                                      getScrollPosition({
                                        scrollPositions,
                                        index,
                                      }) + initialPlaceholderWidth
                                    }px`,
                                  }}
                                >
                                  {/* TODO: probably should make measureLine have its own interface
                                so that we can just directly use the type field rather than logic below */}
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
                                    index={index}
                                    chord={chord}
                                    scrollPositions={scrollPositions}
                                    audioMetadata={audioMetadata}
                                    loopDelay={loopDelay}
                                    isHighlighted={
                                      !audioMetadata.editingLoopRange &&
                                      ((audioMetadata.playing &&
                                        highlightChord({
                                          chordIndex: index,
                                          type: "isBeingPlayed",
                                        })) ||
                                        highlightChord({
                                          chordIndex: index,
                                          type: "hasBeenPlayed",
                                        }))
                                    }
                                  />
                                </div>
                              )}
                            </Fragment>
                          ))}
                        </div>
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
                chordDurations={chordDurations}
                loopRange={loopRange}
                setLoopRange={setLoopRange}
                tabProgressValue={tabProgressValue}
                setTabProgressValue={setTabProgressValue}
              />
              <PlaybackBottomMetadata
                loopRange={loopRange}
                setLoopRange={setLoopRange}
                tabProgressValue={tabProgressValue}
                setTabProgressValue={setTabProgressValue}
              />
            </div>
          )}

          <Button
            variant={"text"}
            className="baseFlex absolute right-2 top-2 size-8 rounded-sm !p-0 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={() => {
              setShowPlaybackModal(false);
              pauseAudio(true);
              setPlaybackModalViewingState("Practice");
              if (audioMetadata.editingLoopRange) {
                setAudioMetadata({
                  ...audioMetadata,
                  editingLoopRange: false,
                });
              }
            }}
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

function getScrollPosition({
  scrollPositions,
  index,
}: {
  scrollPositions: ScrollPositions;
  index: number;
}) {
  if (scrollPositions === null) return 0;

  return (
    scrollPositions.byId[scrollPositions.allIds[index] || 0]?.currentPosition ||
    scrollPositions.byId[scrollPositions.allIds[index] || 0]
      ?.originalPosition ||
    0
  );
}

function getScrollContainerTransform({
  scrollPositions,
  currentChordIndex,
  audioMetadata,
  numberOfChords,
}: {
  scrollPositions: ScrollPositions;
  currentChordIndex: number;
  audioMetadata: AudioMetadata;
  numberOfChords: number;
}) {
  // when looping, you want to go back to the first chord position, since it
  // will already be translated to the right side of last chord position in main tab
  const index =
    audioMetadata.playing && currentChordIndex === numberOfChords - 1
      ? 0
      : currentChordIndex + (audioMetadata.playing ? 1 : 0);

  // needed(?) to prevent index from going out of bounds when looping
  const clampedIndex = Math.min(index, scrollPositions.allIds.length - 1);

  return `translateX(${getScrollPosition({ scrollPositions, index: clampedIndex }) * -1}px)`;
}

interface RenderChordByType {
  type: "tab" | "measureLine" | "strum" | "loopDelaySpacer";
  index: number;
  chord:
    | PlaybackTabChordType
    | PlaybackStrummedChordType
    | PlaybackLoopDelaySpacerChord;
  scrollPositions: ScrollPositions;
  audioMetadata: AudioMetadata;
  loopDelay: number;
  isHighlighted: boolean;
}

function RenderChordByType({
  type,
  index,
  chord,
  scrollPositions,
  audioMetadata,
  loopDelay,
  isHighlighted,
}: RenderChordByType) {
  if (type === "tab" && chord?.type === "tab") {
    return (
      <PlaybackTabChord
        columnData={chord?.data.chordData}
        isFirstChordInSection={
          index === 0 &&
          (loopDelay !== 0 ||
            scrollPositions.byId[scrollPositions.allIds[0] || 0]
              ?.currentPosition === null)
        }
        isLastChordInSection={chord?.isLastChord && loopDelay !== 0}
        isHighlighted={isHighlighted}
        isDimmed={
          audioMetadata.editingLoopRange &&
          (index < audioMetadata.startLoopIndex ||
            (audioMetadata.endLoopIndex !== -1 &&
              index > audioMetadata.endLoopIndex))
        }
      />
    );
  }

  if (type === "measureLine" && chord?.type === "tab") {
    return (
      <PlaybackTabMeasureLine
        columnData={chord!.data.chordData}
        isDimmed={
          audioMetadata.editingLoopRange &&
          (index < audioMetadata.startLoopIndex ||
            (audioMetadata.endLoopIndex !== -1 &&
              index > audioMetadata.endLoopIndex))
        }
      />
    );
  }

  if (type === "strum" && chord?.type === "strum") {
    return (
      <PlaybackStrummedChord
        strumIndex={chord?.data.strumIndex || 0}
        strum={chord?.data.strum || ""}
        palmMute={chord?.data.palmMute || ""}
        isFirstChordInSection={
          index === 0 &&
          (loopDelay !== 0 ||
            scrollPositions.byId[scrollPositions.allIds[0] || 0]
              ?.currentPosition === null)
        }
        isLastChordInSection={chord?.isLastChord && loopDelay !== 0}
        noteLength={chord?.data.noteLength || "1/4th"}
        bpmToShow={chord?.data.showBpm ? chord?.data.bpm : undefined}
        chordName={chord?.data.chordName || ""}
        isHighlighted={isHighlighted}
        isDimmed={
          audioMetadata.editingLoopRange &&
          (index < audioMetadata.startLoopIndex ||
            (audioMetadata.endLoopIndex !== -1 &&
              index > audioMetadata.endLoopIndex))
        }
      />
    );
  }

  if (type === "loopDelaySpacer") {
    return (
      <div
        style={{
          position: "absolute",
          width: "35px",
          height: "100%",
          backgroundColor: "black",
          left: 0,
        }}
      ></div>
    );
  }
}
