import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { getTrackBackground, Range } from "react-range";
import { useTabStore } from "~/stores/TabStore";
import { getConcreteDraftLoopRange } from "~/utils/loopRangeHelpers";

interface PlaybackProgressSlider {
  disabled: boolean;
  chordDurations: number[];
  setChordRepetitions: Dispatch<SetStateAction<number[]>>;
  scrollPositionsLength: number;
}

function PlaybackProgressSlider({
  disabled,
  chordDurations,
  setChordRepetitions,
  scrollPositionsLength,
}: PlaybackProgressSlider) {
  const {
    currentChordIndex,
    setCurrentChordIndex,
    currentlyPlayingMetadata,
    audioMetadata,
    pauseAudio,
    draftLoopStartIndex,
    draftLoopEndIndex,
    setDraftLoopRange,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    setCurrentChordIndex: state.setCurrentChordIndex,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    audioMetadata: state.audioMetadata,
    pauseAudio: state.pauseAudio,
    draftLoopStartIndex: state.draftLoopStartIndex,
    draftLoopEndIndex: state.draftLoopEndIndex,
    setDraftLoopRange: state.setDraftLoopRange,
  }));

  const prevEditingLoopRangeState = useRef(audioMetadata.editingLoopRange);

  const loopRange = getConcreteDraftLoopRange(
    draftLoopStartIndex,
    draftLoopEndIndex,
    audioMetadata.fullTabMetadataLength,
  );

  // keeps draft loop range in sync when changing selected section back to full
  useEffect(() => {
    if (
      audioMetadata.startLoopIndex === 0 &&
      audioMetadata.endLoopIndex === -1 &&
      !audioMetadata.editingLoopRange
    ) {
      setDraftLoopRange({ startIndex: null, endIndex: null });
    }
  }, [
    audioMetadata.startLoopIndex,
    audioMetadata.endLoopIndex,
    audioMetadata.editingLoopRange,
    setDraftLoopRange,
  ]);

  useEffect(() => {
    // Check if the value has changed from true to false or false to true
    if (prevEditingLoopRangeState.current !== audioMetadata.editingLoopRange) {
      setCurrentChordIndex(
        audioMetadata.editingLoopRange ? loopRange[0] || 0 : 0,
      );
    }

    // Update ref to the current value for the next render
    prevEditingLoopRangeState.current = audioMetadata.editingLoopRange;
  }, [audioMetadata.editingLoopRange, loopRange, setCurrentChordIndex]);

  // might want to do something dynamic visually with isDragged prop for thumbs

  // used to keep currentChordIndex within bounds of the currently playing metadata
  // when the tab is artifically extended to fit within the user's viewport
  function mapToRange(value: number, min: number, max: number) {
    const rangeSize = max - min + 1;
    const normalized = (((value - min) % rangeSize) + rangeSize) % rangeSize;
    return normalized;
  }

  const isPlayingAndNotAtEnd =
    audioMetadata.playing &&
    (currentChordIndex + 1) % currentlyPlayingMetadata!.length !== 0;

  const maxIndex = currentlyPlayingMetadata
    ? currentlyPlayingMetadata.length - 1
    : 0;

  if (audioMetadata.fullTabMetadataLength <= 1 && maxIndex <= 0) {
    return null;
  }

  return (
    <>
      {audioMetadata.editingLoopRange ? (
        <Range
          key={"rangeTwoThumbs"} // needed so thumb(s) are properly initialized
          label="Start/end slider to control range to loop within current tab"
          step={1}
          min={0}
          max={audioMetadata.fullTabMetadataLength - 1}
          draggableTrack
          values={loopRange}
          onChange={(newLoopRange) => {
            const nextStart = newLoopRange[0] ?? 0;
            const nextEnd = newLoopRange[1] ?? 0;

            // react-range doesn't allow for a range of 0
            if (Math.abs(nextStart - nextEnd) === 0) return;

            const prevStart = loopRange[0];
            const prevEnd = loopRange[1];
            const startChanged = nextStart !== prevStart;
            const endChanged = nextEnd !== prevEnd;

            // Window shift (both thumbs moved): scroll to the start node.
            // Otherwise scroll to whichever boundary changed.
            if (startChanged && endChanged) {
              setCurrentChordIndex(nextStart);
            } else if (startChanged) {
              setCurrentChordIndex(nextStart);
            } else if (endChanged) {
              setCurrentChordIndex(nextEnd);
            }

            setDraftLoopRange({
              startIndex: nextStart,
              endIndex: nextEnd,
            });
          }}
          renderTrack={({ props, children, disabled }) => (
            <div
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              style={{
                ...props.style,
                display: "flex",
                width: "100%",
              }}
            >
              <div
                ref={props.ref}
                style={{
                  height: "8px",
                  width: "100%",
                  borderRadius: "4px",
                  filter: disabled ? "brightness(0.75)" : "none",
                  background: getTrackBackground({
                    values: loopRange,
                    colors: [
                      "hsl(var(--gray) / 0.75)",
                      "hsl(var(--primary))",
                      "hsl(var(--gray) / 0.75)",
                    ],
                    min: 0,
                    max: audioMetadata.fullTabMetadataLength - 1,
                  }),
                  alignSelf: "center",
                }}
                className="transition-all"
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props, index }) => {
            // react-range was including a key value inside of props
            const { key, ...thumbProps } = props;

            return (
              <div
                key={`${key}-${index}-toggle`}
                {...thumbProps}
                style={{
                  ...thumbProps.style,
                }}
                className="z-10 size-[18px] rounded-full border border-foreground/50 bg-primary will-change-transform"
              />
            );
          }}
        />
      ) : (
        <Range
          key={"rangeOneThumb"} // needed so thumb is properly initialized
          label="Slider to control the progress within the current tab"
          step={1}
          min={0}
          max={maxIndex}
          values={[
            mapToRange(
              currentChordIndex + (isPlayingAndNotAtEnd ? 1 : 0),
              0,
              maxIndex,
            ),
          ]}
          disabled={disabled}
          onChange={(values) => {
            if (audioMetadata.playing) {
              pauseAudio();
            }

            if (values[0] === undefined) return;

            if (values[0] < currentChordIndex) {
              // virtualization logic is set up to handle "forward" movement only, so we need to reset
              // whenever we move backwards to ensure the correct chords are rendered
              setChordRepetitions(new Array(scrollPositionsLength).fill(0));
            }

            setCurrentChordIndex(values[0]);
          }}
          renderTrack={({ props, children, disabled }) => (
            <div
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              onPointerDown={() => {
                if (audioMetadata.playing) {
                  pauseAudio();
                }
              }}
              style={{
                ...props.style,
                display: "flex",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <div
                ref={props.ref}
                style={{
                  height: "8px",
                  borderRadius: "4px",
                  filter: disabled ? "brightness(0.75)" : "none",
                  alignSelf: "center",
                }}
                className={`relative w-full bg-[hsl(var(--gray)/0.5)]`}
              >
                <div className="absolute left-0 top-0 h-full w-full overflow-hidden rounded-[4px]">
                  <div
                    id="playbackSliderTrack"
                    style={{
                      transform: `scaleX(${
                        mapToRange(
                          currentChordIndex + (isPlayingAndNotAtEnd ? 1 : 0),
                          0,
                          maxIndex,
                        ) / maxIndex
                      })`,
                      transitionProperty: "transform",
                      transitionTimingFunction: "linear",
                      transitionDuration: `${
                        audioMetadata.playing
                          ? `${chordDurations[currentChordIndex] ?? 0}s`
                          : "0s"
                      }`,
                    }}
                    className="absolute left-0 top-0 z-10 h-full w-full origin-left rounded-[4px] bg-primary will-change-transform"
                  ></div>
                </div>
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props }) => {
            const { key, ...thumbProps } = props;

            return (
              <div
                key={key}
                {...thumbProps}
                id="playbackSliderThumb"
                style={{
                  ...thumbProps.style,
                  transitionProperty: "transform",
                  transitionTimingFunction: "linear",
                  transitionDuration: `${
                    audioMetadata.playing
                      ? `${chordDurations[currentChordIndex] ?? 0}s`
                      : "0s"
                  }`,
                }}
                className="!z-20 size-[18px] rounded-full border border-foreground/50 bg-primary will-change-transform"
              />
            );
          }}
        />
      )}
    </>
  );
}

export default PlaybackProgressSlider;
