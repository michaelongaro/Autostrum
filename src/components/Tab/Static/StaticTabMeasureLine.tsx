import { motion } from "framer-motion";
import { Fragment } from "react";
import { QuarterNote } from "~/utils/bpmIconRenderingHelpers";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import type { COLORS, THEME } from "~/stores/TabStore";

interface StaticTabMeasureLine {
  columnData: string[];
  color: COLORS;
  theme: THEME;
}

function StaticTabMeasureLine({
  columnData,
  color,
  theme,
}: StaticTabMeasureLine) {
  return (
    <motion.div
      key={columnData[9]}
      className="baseVertFlex relative h-[271px] w-[2px]"
    >
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            <>
              {columnData[7] && columnData[7] !== "-1" && (
                <div
                  style={{
                    color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                  }}
                  className={`baseFlex absolute gap-[0.125rem] ${
                    note === "-" ? "top-[10px]" : "top-[27px]"
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
                      backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                    }}
                    className="relative top-[-17px] h-[1px] w-full"
                  ></div>
                )}
              </div>
            </>
          )}

          {index > 0 && index < 7 && (
            <div className="baseFlex w-full">
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className="h-[28px] w-[2px]"
              ></div>
            </div>
          )}
        </Fragment>
      ))}
    </motion.div>
  );
}

export default StaticTabMeasureLine;
