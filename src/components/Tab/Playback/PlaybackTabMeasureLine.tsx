import { Fragment } from "react";
import { QuarterNote } from "~/utils/noteLengthIcons";

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
      className="baseVertFlex mb-[72px] h-[220px] w-[2px] mobilePortrait:h-[240px]"
    >
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            <>
              {columnData[7] && columnData[7] !== "-1" && (
                <div
                  className={`baseFlex absolute gap-[0.125rem] text-foreground ${
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
  );
}

export default PlaybackTabMeasureLine;
