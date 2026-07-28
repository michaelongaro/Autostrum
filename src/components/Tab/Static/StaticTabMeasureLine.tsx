import { QuarterNote } from "~/utils/noteLengthIcons";
import type { TabMeasureLine as TabMeasureLineType } from "~/stores/TabStore";
import {
  STATIC_TAB_MEASURE_LINE_WIDTH_PX,
  STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX,
  STATIC_TAB_ROW_HEIGHT_PX,
} from "~/utils/staticTabGeometry";

interface StaticTabMeasureLineProps {
  columnData: TabMeasureLineType;
}

function StaticTabMeasureLine({ columnData }: StaticTabMeasureLineProps) {
  return (
    <div
      style={{
        height: STATIC_TAB_ROW_HEIGHT_PX,
        width: STATIC_TAB_MEASURE_LINE_WIDTH_PX,
      }}
      className="baseVertFlex relative"
    >
      {/* BPM indicator */}

      {columnData.bpmAfterLine !== null ? (
        <div
          style={{
            color: "hsl(var(--screenshot-foreground))",
          }}
          className={`baseFlex shrink-0 gap-[2px] ${columnData.isInPalmMuteSection ? "h-4" : "h-8"}`}
        >
          <QuarterNote />
          <p className="text-center text-xs">
            {columnData.bpmAfterLine.toString()}
          </p>
        </div>
      ) : (
        <div className="h-4 w-full shrink-0"></div>
      )}

      {/* Palm mute connecting line */}
      {columnData.isInPalmMuteSection ? (
        <div className="baseFlex h-4 w-full shrink-0">
          <div
            style={{
              backgroundColor: "hsl(var(--screenshot-foreground))",
            }}
            className="relative mt-[-16px] h-[1px] w-full"
          ></div>
        </div>
      ) : (
        <>
          {columnData.bpmAfterLine === null && (
            <div className="h-4 w-full shrink-0"></div>
          )}
        </>
      )}

      {/* Vertical measure line segments for each string (1-6) */}
      {([0, 1, 2, 3, 4, 5, 6, 7] as const).map((stringIndex) => (
        <div
          key={stringIndex}
          style={{
            backgroundColor: "hsl(var(--screenshot-foreground))",
          }}
          className="baseFlex w-full shrink-0"
        >
          {stringIndex === 0 && (
            <div className="baseVertFlex h-[8px] w-full !justify-start">
              <div
                style={{
                  backgroundColor: "hsl(var(--screenshot-foreground))",
                }}
                className="h-[2px] w-full"
              ></div>
            </div>
          )}

          {stringIndex !== 0 && stringIndex !== 7 && (
            <div className="h-[24px] w-[2px]"></div>
          )}

          {stringIndex === 7 && (
            <div className="baseVertFlex h-[8px] w-full !justify-end">
              <div
                style={{
                  backgroundColor: "hsl(var(--screenshot-foreground))",
                }}
                className="h-[2px] w-full"
              ></div>
            </div>
          )}
        </div>
      ))}

      <div
        style={{ height: STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX }}
        className="w-full"
      ></div>
    </div>
  );
}

export default StaticTabMeasureLine;
