import { motion } from "framer-motion";
import { QuarterNote } from "~/utils/noteLengthIcons";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import type {
  COLORS,
  THEME,
  TabMeasureLine as TabMeasureLineType,
} from "~/stores/TabStore";

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
    <motion.div
      key={columnData.id}
      className="baseVertFlex relative h-[290px] w-[2px]"
    >
      {/* BPM indicator */}
      {columnData.bpmAfterLine !== null && (
        <div
          style={{
            color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
          }}
          className={`baseFlex absolute gap-[0.125rem] ${
            columnData.isInPalmMuteSection ? "top-[15px]" : "top-[35px]"
          }`}
        >
          <QuarterNote />
          <p className="text-center text-xs">
            {columnData.bpmAfterLine.toString()}
          </p>
        </div>
      )}

      {/* Palm mute connecting line */}
      <div className="baseFlex mb-0 h-0 w-full">
        {columnData.isInPalmMuteSection && (
          <div
            style={{
              backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
            }}
            className="relative top-[-17px] h-[1px] w-full"
          ></div>
        )}
      </div>

      {/* Measure line segments for each string (1-6) */}
      {([1, 2, 3, 4, 5, 6] as const).map((stringIndex) => (
        <div
          key={stringIndex}
          style={{
            marginTop: stringIndex === 1 ? "1px" : "0px",
          }}
          className="baseFlex w-full"
        >
          <div
            style={{
              backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
            }}
            className="h-[28px] w-[2px]"
          ></div>
        </div>
      ))}
    </motion.div>
  );
}

export default StaticTabMeasureLine;
