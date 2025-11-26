import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { getTrackBackground, Range } from "react-range";
import { useTabStore } from "~/stores/TabStore";

interface PlaybackProgressSlider {
  disabled: boolean;
  chordDurations: number[];
  loopRange: [number, number];
  setLoopRange: Dispatch<SetStateAction<[number, number]>>;
  setChordRepetitions: Dispatch<SetStateAction<number[]>>;
  scrollPositionsLength: number;
}

function PlaybackProgressSlider({
  disabled,
  chordDurations,
  loopRange,
  setLoopRange,
  setChordRepetitions,
  scrollPositionsLength,
}: PlaybackProgressSlider) {
  const {
    currentChordIndex,
    setCurrentChordIndex,
    currentlyPlayingMetadata,
    audioMetadata,
    setAudioMetadata,
    pauseAudio,
    playbackMetadata,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    setCurrentChordIndex: state.setCurrentChordIndex,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    pauseAudio: state.pauseAudio,
    playbackMetadata: state.playbackMetadata,
  }));

  const prevEditingLoopRangeState = useRef(audioMetadata.editingLoopRange);

  // keeps loopRange in sync when changing selected section
  useEffect(() => {
    if (
      audioMetadata.startLoopIndex === 0 &&
      audioMetadata.endLoopIndex === -1
    ) {
      setLoopRange([0, audioMetadata.fullCurrentlyPlayingMetadataLength - 1]);
    }
  }, [
    audioMetadata.startLoopIndex,
    audioMetadata.endLoopIndex,
    audioMetadata.fullCurrentlyPlayingMetadataLength,
    setLoopRange,
  ]);

  useEffect(() => {
    if (
      !audioMetadata.editingLoopRange ||
      playbackMetadata?.[loopRange[0] || 0]?.type === "ornamental" ||
      playbackMetadata?.[loopRange[1] || 0]?.type === "ornamental"
    ) {
      return;
    }

    // don't think this works, just want to only enter this block if the loop range is actually
    // different from the start/end loop indices, handling the case where the end loop index is
    // the last chord in the tab
    if (
      loopRange[0] !== audioMetadata.startLoopIndex ||
      loopRange[1] !== audioMetadata.endLoopIndex
    ) {
      if (
        loopRange[0] === audioMetadata.startLoopIndex &&
        loopRange[1] === audioMetadata.fullCurrentlyPlayingMetadataLength - 1 &&
        audioMetadata.endLoopIndex === -1
      ) {
        return;
      }

      const adjustedStartIndex = loopRange[0] || 0;
      const adjustedEndIndex =
        loopRange[1] === audioMetadata.fullCurrentlyPlayingMetadataLength - 1
          ? -1
          : loopRange[1] || 0;

      const newCurrentChordIndex =
        adjustedStartIndex !== audioMetadata.startLoopIndex
          ? adjustedStartIndex
          : adjustedEndIndex;

      setCurrentChordIndex(
        newCurrentChordIndex === -1
          ? audioMetadata.fullCurrentlyPlayingMetadataLength - 1
          : (newCurrentChordIndex ?? 0),
      );

      setAudioMetadata({
        ...audioMetadata,
        startLoopIndex: adjustedStartIndex,
        endLoopIndex: adjustedEndIndex,
      });
    }
  }, [
    loopRange,
    audioMetadata,
    setAudioMetadata,
    setCurrentChordIndex,
    playbackMetadata,
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

  return (
    <>
      {audioMetadata.editingLoopRange ? (
        <Range
          key={"rangeTwoThumbs"} // needed so thumb(s) are properly initialized
          label="Start/end slider to control range to loop within current tab"
          step={1}
          min={0}
          max={audioMetadata.fullCurrentlyPlayingMetadataLength - 1}
          // allowOverlap={true}
          draggableTrack
          values={loopRange}
          onChange={(newLoopRange) => {
            // react-range doesn't allow for a range of 0
            if (Math.abs((newLoopRange[0] ?? 0) - (newLoopRange[1] ?? 0)) === 0)
              return;

            setLoopRange(newLoopRange as [number, number]);
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
                    max: audioMetadata.fullCurrentlyPlayingMetadataLength - 1,
                  }),
                  alignSelf: "center",
                }}
                className="transition-all"
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props, index }) => (
            <div
              {...props}
              key={`${props.key}-${index}-toggle`}
              style={{
                ...props.style,
              }}
              className="z-10 size-[18px] rounded-full border bg-primary will-change-transform"
            />
          )}
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
                className={`relative w-full bg-[hsl(var(--gray)/0.5)] mobileLandscape:w-[95%]`}
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
          renderThumb={({ props }) => (
            <div
              {...props}
              id="playbackSliderThumb"
              style={{
                ...props.style,
                transitionProperty: "transform",
                transitionTimingFunction: "linear",
                transitionDuration: `${
                  audioMetadata.playing
                    ? `${chordDurations[currentChordIndex] ?? 0}s`
                    : "0s"
                }`,
              }}
              className="!z-20 size-[18px] rounded-full border bg-primary will-change-transform"
            />
          )}
        />
      )}
    </>
  );
}

export default PlaybackProgressSlider;
