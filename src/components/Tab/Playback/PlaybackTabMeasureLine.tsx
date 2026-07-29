import { Fragment } from "react";
import { useTabStore } from "~/stores/TabStore";
import { getLoopRangeNodePresentation } from "~/utils/loopRangeHelpers";
import { QuarterNote } from "~/utils/noteLengthIcons";

interface PlaybackTabMeasureLine {
  columnData: string[];
  chordIndex?: number;
  isDimmed: boolean;
}

function PlaybackTabMeasureLine({
  columnData,
  chordIndex,
  isDimmed,
}: PlaybackTabMeasureLine) {
  const {
    audioMetadata,
    draftLoopStartIndex,
    draftLoopEndIndex,
  } = useTabStore((state) => ({
    audioMetadata: state.audioMetadata,
    draftLoopStartIndex: state.draftLoopStartIndex,
    draftLoopEndIndex: state.draftLoopEndIndex,
  }));

  const editingLoopRange = audioMetadata.editingLoopRange;
  const loopNodePresentation =
    editingLoopRange && typeof chordIndex === "number"
      ? getLoopRangeNodePresentation({
          index: chordIndex,
          isSelectableChord: false,
          draftStartIndex: draftLoopStartIndex,
          draftEndIndex: draftLoopEndIndex,
          fullTabMetadataLength: audioMetadata.fullTabMetadataLength,
        })
      : null;

  return (
    <div
      style={{
        opacity: isDimmed ? 0.5 : 1,
        transition: "opacity 0.5s",
      }}
      className="baseVertFlex"
    >
      <div className="baseVertFlex mb-[2px] h-[220px] w-[2px] mobilePortrait:h-[240px]">
        {columnData.map((note, index) => (
          <Fragment key={index}>
            {index === 0 && (
              <>
                {columnData[7] && columnData[7] !== "-1" && (
                  <div
                    className={`baseFlex absolute gap-[2px] text-foreground ${
                      note === "-" ? "-top-1" : "top-3"
                    }`}
                  >
                    <QuarterNote />
                    <p className="text-center text-xs">
                      {columnData[7].toString()}
                    </p>
                  </div>
                )}

                <div className="baseFlex mb-0 h-0 w-full">
                  {note === "-" && (
                    <div
                      style={{
                        top: "-14px",
                      }}
                      className="relative h-[1px] w-full bg-foreground"
                    ></div>
                  )}
                </div>
              </>
            )}

            {index > 0 && index < 7 && (
              <div className="baseFlex w-full">
                <div className="h-[24px] w-[2px] bg-foreground mobilePortrait:h-[28px]"></div>
              </div>
            )}
          </Fragment>
        ))}
      </div>

      {editingLoopRange && (
        <div className="baseFlex mt-1 h-7 w-full">
          {loopNodePresentation?.role === "middle" ? (
            <div className="h-px w-full bg-foreground" />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default PlaybackTabMeasureLine;
