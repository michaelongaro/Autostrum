import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { getTrackBackground, Range } from "react-range";
import { useTabStore } from "~/stores/TabStore";

interface PlaybackProgressSlider {
  disabled: boolean;
  chordDurations: number[];
  loopRange: [number, number];
  setLoopRange: Dispatch<SetStateAction<[number, number]>>;
}

function PlaybackProgressSlider({
  disabled,
  chordDurations,
  loopRange,
  setLoopRange,
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
  }, [audioMetadata.editingLoopRange, loopRange, setCurrentChordIndex]); // Dependency array contains the boolean value

  // might want to do something dynamic visually  with isDragged prop for thumbs

  return (
    <>
      {audioMetadata.editingLoopRange ? (
        <Range
          key={"rangeTwoThumbs"} // needed so thumb(s) are properly initialized
          label="Range to loop within tab"
          step={1}
          min={0}
          max={audioMetadata.fullCurrentlyPlayingMetadataLength - 1}
          // allowOverlap={true}
          draggableTrack
          values={loopRange}
          // any use for onFinalChange?
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
          label="Progress within tab"
          step={1}
          min={0}
          max={
            currentlyPlayingMetadata ? currentlyPlayingMetadata.length - 1 : 0
          }
          values={[
            // bounding the value to the range of the tab
            Math.min(
              currentChordIndex + (audioMetadata.playing ? 1 : 0),
              currentlyPlayingMetadata!.length - 1,
            ),
          ]}
          disabled={disabled}
          // any use for onFinalChange?
          onChange={(values) => {
            if (audioMetadata.playing) {
              pauseAudio();
            }

            setCurrentChordIndex(values[0] ?? 0);
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
                  background: getTrackBackground({
                    values: [currentChordIndex],
                    colors: ["hsl(var(--primary))", "hsl(var(--gray) / 0.75)"],
                    min: 0,
                    max: currentlyPlayingMetadata?.length ?? 0,
                  }),
                  alignSelf: "center",
                }}
                className="mobileNarrowLandscape:w-[95100 w-full transition-all mobileLandscape:w-[95%]"
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props, index }) => (
            <div
              {...props}
              key={`${props.key}-${index}`}
              style={{
                ...props.style,
                transition: `transform ${
                  currentChordIndex === 0
                    ? 0
                    : audioMetadata.playing
                      ? (chordDurations[currentChordIndex] ?? 0)
                      : 0
                }s linear`,
              }}
              className="z-10 size-[18px] rounded-full border bg-primary will-change-transform"
            />
          )}
        />
      )}
    </>
  );
}

export default PlaybackProgressSlider;
