import { type Dispatch, type SetStateAction } from "react";
import { Range } from "react-range";
import { useTabStore } from "~/stores/TabStore";

interface PlaybackAudioRange {
  disabled: boolean;
  chordDurations: number[];
  setChordRepetitions: Dispatch<SetStateAction<number[]>>;
  scrollPositionsLength: number;
}

function PlaybackAudioRange({
  disabled,
  chordDurations,
  setChordRepetitions,
  scrollPositionsLength,
}: PlaybackAudioRange) {
  const {
    currentChordIndex,
    setCurrentChordIndex,
    currentlyPlayingMetadata,
    audioMetadata,
    pauseAudio,
  } = useTabStore((state) => ({
    currentChordIndex: state.currentChordIndex,
    setCurrentChordIndex: state.setCurrentChordIndex,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    audioMetadata: state.audioMetadata,
    pauseAudio: state.pauseAudio,
  }));

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
              alignSelf: "center",
              filter: disabled ? "brightness(0.75)" : "none",
            }}
            className={`relative w-full bg-[hsl(var(--gray)/0.5)] transition`}
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
  );
}

export default PlaybackAudioRange;
