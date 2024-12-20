import { Fragment } from "react";
import { QuarterNote } from "~/utils/bpmIconRenderingHelpers";

interface PlaybackTabMeasureLine {
  columnData: string[];
  isDimmed: boolean;
}

function PlaybackTabMeasureLine({
  columnData,
  isDimmed,
}: PlaybackTabMeasureLine) {
  return (
    <div
      style={{
        opacity: isDimmed ? 0.5 : 1,
        transition: "opacity 0.5s",
      }}
      className="ornamental playbackElem baseVertFlex mb-2 h-[240px] w-[2px]"
    >
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            <>
              {columnData[7] && columnData[7] !== "-1" && (
                <div
                  className={`baseFlex absolute !flex-nowrap gap-[0.125rem] text-pink-100 ${
                    note === "-" ? "top-0" : "top-2"
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
                    className="relative h-[1px] w-full bg-white"
                  ></div>
                )}
              </div>
            </>
          )}

          {index > 0 && index < 7 && (
            <div className="baseFlex w-full">
              <div
                style={{
                  height: "28px",
                }}
                className="w-[2px] bg-white"
              ></div>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default PlaybackTabMeasureLine;
