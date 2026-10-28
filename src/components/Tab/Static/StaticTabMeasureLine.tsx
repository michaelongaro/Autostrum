import { QuarterNote } from "~/utils/noteLengthIcons";
import {
  STATIC_TAB_MEASURE_LINE_WIDTH_PX,
  STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX,
  STATIC_TAB_PALM_MUTE_HEADER_HEIGHT_PX,
  STATIC_TAB_ROW_HEIGHT_PX,
  STATIC_TAB_STAFF_LINE_HEIGHT_PX,
  STATIC_TAB_STAFF_LINE_INSET_PX,
  STATIC_TAB_STRINGS_HEIGHT_PX,
} from "~/utils/staticTabGeometry";

interface StaticTabMeasureLineProps {
  /** Whether this measure line sits inside a palm-mute span. */
  isInPalmMuteSection: boolean;
  /**
   * When true, render the BPM label above the staff (tempo changes across
   * this measure line). Value is the effective post-line BPM.
   */
  showBpm: boolean;
  bpmToShow?: number;
}

function StaticTabMeasureLine({
  isInPalmMuteSection,
  showBpm,
  bpmToShow,
}: StaticTabMeasureLineProps) {
  return (
    <div
      data-static-tab-measure-line=""
      style={{
        height: STATIC_TAB_ROW_HEIGHT_PX,
        width: STATIC_TAB_MEASURE_LINE_WIDTH_PX,
      }}
      className="baseVertFlex relative !justify-start"
    >
      <div
        style={{ height: isInPalmMuteSection ? "0px" : "12px" }}
        className="w-full shrink-0"
      />

      {/* BPM indicator — only when chord-before BPM ≠ chord-after BPM */}

      {showBpm && bpmToShow !== undefined ? (
        <div
          style={{
            color: "hsl(var(--screenshot-foreground))",
          }}
          className={`baseFlex shrink-0 gap-[2px] ${isInPalmMuteSection ? "h-4" : "h-8"}`}
        >
          <QuarterNote />
          <p className="text-center text-xs">{bpmToShow.toString()}</p>
        </div>
      ) : (
        <div className="h-4 w-full shrink-0"></div>
      )}

      {/* Palm mute connecting line */}
      {isInPalmMuteSection ? (
        <div className="baseFlex h-4 w-full shrink-0">
          <div
            style={{
              backgroundColor: "hsl(var(--screenshot-foreground))",
            }}
            className="relative mt-[-8px] h-[1px] w-full"
          ></div>
        </div>
      ) : (
        <>{!showBpm && <div className="h-4 w-full shrink-0"></div>}</>
      )}

      {/* Keep the staff anchored independently of the BPM/palm-mute spacers. */}

      <div
        className="w-full shrink-0"
        style={{ height: STATIC_TAB_STRINGS_HEIGHT_PX }}
      >
        <div
          data-static-tab-measure-staff=""
          className="absolute"
          style={{
            width: STATIC_TAB_MEASURE_LINE_WIDTH_PX,
            height: STATIC_TAB_STAFF_LINE_HEIGHT_PX,
            top:
              STATIC_TAB_PALM_MUTE_HEADER_HEIGHT_PX +
              STATIC_TAB_STAFF_LINE_INSET_PX,
            backgroundColor: "hsl(var(--screenshot-foreground) / 0.5)",
          }}
        />
      </div>

      <div
        style={{
          height: STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX,
        }}
        className="w-full"
      ></div>
    </div>
  );
}

export default StaticTabMeasureLine;
