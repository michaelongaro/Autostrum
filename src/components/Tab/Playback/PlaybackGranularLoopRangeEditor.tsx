import { FaLessThan } from "react-icons/fa";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/stores/TabStore";

interface PlaybackGranularLoopRangeEditor {
  loopRange: [number, number];
  setLoopRange: React.Dispatch<React.SetStateAction<[number, number]>>;
}

function PlaybackGranularLoopRangeEditor({
  loopRange,
  setLoopRange,
}: PlaybackGranularLoopRangeEditor) {
  const { audioMetadata, playbackMetadata, viewportLabel } = useTabStore(
    (state) => ({
      audioMetadata: state.audioMetadata,
      playbackMetadata: state.playbackMetadata,
      viewportLabel: state.viewportLabel,
    }),
  );

  return (
    <div
      style={{
        height: viewportLabel.includes("Landscape") ? "52px" : "40px",
      }}
      className="baseFlex relative mx-4 w-full gap-4 xs:gap-12"
    >
      <div
        style={{
          top: viewportLabel.includes("Landscape") ? "-1rem" : "-3rem",
        }}
        className="baseFlex absolute left-0 w-full text-nowrap text-xs text-gray"
      >
        Scrub or use the buttons below to modify the loop range
      </div>
      <div className="baseFlex gap-2 xs:gap-4">
        <Button
          variant={"outline"}
          disabled={
            loopRange[0] === 0 || Math.abs(loopRange[0] - loopRange[1]) < 2
          }
          onClick={() => {
            if (loopRange[0] === 0 || Math.abs(loopRange[0] - loopRange[1]) < 2)
              return;

            let newStartLoopIndex = loopRange[0] - 1;

            while (
              playbackMetadata?.[newStartLoopIndex]?.type === "ornamental"
            ) {
              if (newStartLoopIndex === 0) return;
              newStartLoopIndex--;
            }

            setLoopRange([newStartLoopIndex, loopRange[1]]);
          }}
          className="h-8 !px-2 !py-0"
        >
          <FaLessThan className="size-3.5" />
        </Button>
        <p className="text-center text-xs font-medium xs:text-sm">Loop start</p>
        <Button
          variant={"outline"}
          disabled={
            loopRange[0] ===
              audioMetadata.fullCurrentlyPlayingMetadataLength - 1 ||
            Math.abs(loopRange[0] - loopRange[1]) < 2
          }
          onClick={() => {
            if (
              loopRange[0] ===
                audioMetadata.fullCurrentlyPlayingMetadataLength - 1 ||
              Math.abs(loopRange[0] - loopRange[1]) < 2
            )
              return;

            let newStartLoopIndex = loopRange[0] + 1;

            while (
              playbackMetadata?.[newStartLoopIndex]?.type === "ornamental"
            ) {
              if (
                newStartLoopIndex ===
                audioMetadata.fullCurrentlyPlayingMetadataLength - 1
              )
                return;
              newStartLoopIndex++;
            }

            setLoopRange([newStartLoopIndex, loopRange[1]]);
          }}
          className="h-8 !px-2 !py-0"
        >
          <FaLessThan className="size-3.5 rotate-180" />
        </Button>
      </div>

      <div className="baseFlex gap-2 xs:gap-4">
        <Button
          variant={"outline"}
          disabled={
            loopRange[1] === 0 || Math.abs(loopRange[0] - loopRange[1]) < 2
          }
          onClick={() => {
            if (loopRange[1] === 0 || Math.abs(loopRange[0] - loopRange[1]) < 2)
              return;

            let newEndLoopIndex = loopRange[1] - 1;

            while (playbackMetadata?.[newEndLoopIndex]?.type === "ornamental") {
              if (newEndLoopIndex === 0) return;
              newEndLoopIndex--;
            }

            setLoopRange([loopRange[0], newEndLoopIndex]);
          }}
          className="h-8 !px-2 !py-0"
        >
          <FaLessThan className="size-3.5" />
        </Button>
        <p className="text-center text-xs font-medium xs:text-sm">Loop end</p>
        <Button
          variant={"outline"}
          disabled={
            loopRange[1] ===
              audioMetadata.fullCurrentlyPlayingMetadataLength - 1 ||
            Math.abs(loopRange[0] - loopRange[1]) < 2
          }
          onClick={() => {
            if (
              loopRange[1] ===
                audioMetadata.fullCurrentlyPlayingMetadataLength - 1 ||
              Math.abs(loopRange[0] - loopRange[1]) < 2
            )
              return;

            let newEndLoopIndex = loopRange[1] + 1;

            while (playbackMetadata?.[newEndLoopIndex]?.type === "ornamental") {
              if (
                newEndLoopIndex ===
                audioMetadata.fullCurrentlyPlayingMetadataLength - 1
              )
                return;
              newEndLoopIndex++;
            }

            setLoopRange([loopRange[0], newEndLoopIndex]);
          }}
          className="h-8 !px-2 !py-0"
        >
          <FaLessThan className="size-3.5 rotate-180" />
        </Button>
      </div>
    </div>
  );
}

export default PlaybackGranularLoopRangeEditor;
