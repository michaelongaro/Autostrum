import { QuarterNote } from "~/utils/noteLengthIcons";
import type { TabMeasureLine as TabMeasureLineType } from "~/stores/TabStore";
import {
  STATIC_TAB_BORDER_SPACER_PX,
  STATIC_TAB_MEASURE_LINE_WIDTH_PX,
  STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX,
  STATIC_TAB_ROW_HEIGHT_PX,
  STATIC_TAB_STAFF_LINE_HEIGHT_PX,
  STATIC_TAB_STAFF_LINE_INSET_PX,
  STATIC_TAB_STRINGS_HEIGHT_PX,
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
      className="baseVertFlex relative !justify-start"
    >
      <div
        style={{ height: columnData.isInPalmMuteSection ? "0px" : "12px" }}
        className="w-full shrink-0"
      />

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
              backgroundColor: "hsl(var(--screenshot-foreground) / 0.5)",
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

      {/* Former top container border — spacer only */}

      <div
        className="relative w-full shrink-0"
        style={{ height: STATIC_TAB_STRINGS_HEIGHT_PX }}
      >
        <div
          style={{
            width: STATIC_TAB_MEASURE_LINE_WIDTH_PX,
            height: STATIC_TAB_STAFF_LINE_HEIGHT_PX,
            marginTop: columnData.isInPalmMuteSection
              ? STATIC_TAB_STAFF_LINE_INSET_PX
              : "0px",
            backgroundColor: "hsl(var(--screenshot-foreground) / 0.5)",
          }}
        />
      </div>

      {/* Former bottom container border — spacer only */}
      <div
        style={{ height: STATIC_TAB_BORDER_SPACER_PX }}
        className="w-full shrink-0"
      />

      <div
        style={{ height: STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX }}
        className="w-full"
      ></div>
    </div>
  );
}

export default StaticTabMeasureLine;
