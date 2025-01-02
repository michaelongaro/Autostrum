import { Fragment } from "react";
import { QuarterNote } from "~/utils/bpmIconRenderingHelpers";

interface PlaybackTabMeasureLine {
  id: string;
  columnData: string[];
  isDimmed: boolean;
}

function PlaybackTabMeasureLine({
  id,
  columnData,
  isDimmed,
}: PlaybackTabMeasureLine) {
  return (
    <div
      key={id}
      style={{
        opacity: isDimmed ? 0.5 : 1,
        transition: "opacity 0.5s",
      }}
      className="baseVertFlex mb-6 h-[220px] w-[2px] mobilePortrait:h-[240px]"
    >
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            <>
              {columnData[7] && columnData[7] !== "-1" && (
                <div
                  className={`baseFlex absolute !flex-nowrap gap-[0.125rem] text-pink-100 ${
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
                    className="relative h-[1px] w-full bg-white"
                  ></div>
                )}
              </div>
            </>
          )}

          {index > 0 && index < 7 && (
            <div className="baseFlex w-full">
              <div className="h-[24px] w-[2px] bg-white mobilePortrait:h-[28px]"></div>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default PlaybackTabMeasureLine;
