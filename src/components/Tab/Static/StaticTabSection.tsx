import { motion } from "framer-motion";
import { Fragment } from "react";
import StaticTabMeasureLine from "~/components/Tab/Static/StaticTabMeasureLine";
import StaticTabNotesColumn from "~/components/Tab/Static/StaticTabNotesColumn";
import { PrettyVerticalTuning } from "~/components/ui/PrettyTuning";
import { useTabStore, type TabSection } from "~/stores/TabStore";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import type { COLORS, THEME } from "~/stores/TabStore";

export interface LastModifiedPalmMuteNodeLocation {
  columnIndex: number;
  prevValue: string;
  currentValue: string;
}

interface StaticTabSection {
  subSectionData: TabSection;
  sectionIndex: number;
  subSectionIndex: number;
  color: COLORS;
  theme: THEME;
}

function StaticTabSection({
  subSectionData,
  sectionIndex,
  subSectionIndex,
  color,
  theme,
}: StaticTabSection) {
  const { tuning } = useTabStore((state) => ({
    tuning: state.tuning,
  }));

  return (
    <motion.div
      key={subSectionData.id}
      transition={{
        layout: {
          type: "spring",
          bounce: 0.15,
          duration: 1,
        },
      }}
      style={{
        borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-border"]})`,
        backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-secondary"]} / 0.5)`,
      }}
      className="baseVertFlex relative h-full !justify-start rounded-md border px-4 shadow-md md:px-8"
    >
      <div className="baseFlex relative w-full flex-wrap !justify-start">
        <div
          style={{
            height: "168px",
            marginBottom: "-1px", // necessary anymore?
            borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
            color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
          }}
          className="baseVertFlex relative rounded-l-2xl border-2 p-2"
        >
          <PrettyVerticalTuning tuning={tuning} height={"150px"} />
        </div>

        {subSectionData.data.map((column, index) => (
          <Fragment key={column[10]}>
            {column.includes("|") ? (
              <StaticTabMeasureLine
                columnData={column}
                color={color}
                theme={theme}
              />
            ) : (
              <StaticTabNotesColumn
                columnData={column}
                columnIndex={index}
                sectionIndex={sectionIndex}
                subSectionIndex={subSectionIndex}
                color={color}
                theme={theme}
                isLastColumn={index === subSectionData.data.length - 1}
              />
            )}
          </Fragment>
        ))}
      </div>
    </motion.div>
  );
}

export default StaticTabSection;
