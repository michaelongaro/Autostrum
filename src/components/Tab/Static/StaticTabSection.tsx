import { motion } from "framer-motion";
import { Fragment, useMemo } from "react";
import StaticTabMeasureLine from "~/components/Tab/Static/StaticTabMeasureLine";
import StaticTabNotesColumn from "~/components/Tab/Static/StaticTabNotesColumn";
import { PrettyVerticalTuning } from "~/components/ui/PrettyTuning";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore, type TabSection } from "~/stores/TabStore";

export interface LastModifiedPalmMuteNodeLocation {
  columnIndex: number;
  prevValue: string;
  currentValue: string;
}

interface StaticTabSection {
  subSectionData: TabSection;
}

function StaticTabSection({ subSectionData }: StaticTabSection) {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const { tuning } = useTabStore((state) => ({
    tuning: state.tuning,
  }));

  const sectionPadding = useMemo(() => {
    let padding = "0 1rem";

    if (aboveMediumViewportWidth) {
      padding = "0 2rem";
    } else {
      padding = "0 1rem";
    }

    return padding;
  }, [aboveMediumViewportWidth]);

  return (
    <motion.div
      key={subSectionData.id}
      // variants={opacityAndScaleVariants}
      transition={{
        layout: {
          type: "spring",
          bounce: 0.15,
          duration: 1,
        },
      }}
      style={{
        padding: sectionPadding,
        borderTopLeftRadius: subSectionData.repetitions > 1 ? 0 : "0.375rem",
      }}
      className="baseVertFlex lightestGlassmorphic relative h-full !justify-start rounded-md"
    >
      <div className="baseFlex relative w-full flex-wrap !justify-start">
        <div
          style={{
            height: "168px",
            marginBottom: "-1px", // necessary anymore?
          }}
          className="baseVertFlex relative rounded-l-2xl border-2 border-pink-100 p-2"
        >
          <PrettyVerticalTuning tuning={tuning} height={"168px"} />
        </div>

        {subSectionData.data.map((column, index) => (
          <Fragment key={column[9]}>
            {column.includes("|") ? (
              <StaticTabMeasureLine columnData={column} />
            ) : (
              <StaticTabNotesColumn columnData={column} columnIndex={index} />
            )}
          </Fragment>
        ))}

        <div
          style={{
            height: "168px",
            marginBottom: "-1px",
          }}
          className="rounded-r-2xl border-2 border-pink-100 p-1"
        ></div>
      </div>
    </motion.div>
  );
}

export default StaticTabSection;
