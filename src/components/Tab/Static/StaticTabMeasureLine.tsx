import { QuarterNote } from "~/utils/noteLengthIcons";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import type {
  COLORS,
  THEME,
  TabMeasureLine as TabMeasureLineType,
} from "~/stores/TabStore";
import {
  STATIC_TAB_MEASURE_LINE_WIDTH_PX,
  STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX,
  STATIC_TAB_ROW_HEIGHT_PX,
} from "~/utils/staticTabGeometry";

interface StaticTabMeasureLineProps {
  columnData: TabMeasureLineType;
  color: COLORS;
  theme: THEME;
}

function StaticTabMeasureLine({
  columnData,
  color,
  theme,
}: StaticTabMeasureLineProps) {
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
            color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
          }}
          className={`baseFlex h-4 shrink-0 gap-[0.125rem] ${columnData.isInPalmMuteSection ? "" : "relative top-3"}`}
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
      <div className="baseFlex h-[16px] w-full shrink-0">
        {columnData.isInPalmMuteSection && (
          <div
            style={{
              backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
            }}
            className="relative mt-[-8px] h-[1px] w-full"
          ></div>
        )}
      </div>

      {/* Vertical measure line segments for each string (1-6) */}
      {([0, 1, 2, 3, 4, 5, 6, 7] as const).map((stringIndex) => (
        <div
          key={stringIndex}
          style={{
            backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
          }}
          className="baseFlex w-full shrink-0"
        >
          {stringIndex === 0 && (
            <div className="baseVertFlex h-[8px] w-full !justify-start">
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
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
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
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
