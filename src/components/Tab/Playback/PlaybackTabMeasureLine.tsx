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
      className="ornamental playbackElem baseVertFlex mb-[9px] h-[240px] w-[2px]"
    >
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            <>
              {columnData[7] && columnData[7] !== "-1" && (
                <div
                  className={`baseFlex absolute !flex-nowrap gap-[0.125rem] text-pink-100 ${
                    note === "-" ? "top-0" : "top-4"
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
                      top: "-18px",
                    }}
                    className="relative h-[1px] w-full bg-pink-100"
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
                className="w-[2px] bg-pink-100"
              ></div>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default PlaybackTabMeasureLine;
