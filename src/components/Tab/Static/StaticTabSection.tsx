import { motion } from "framer-motion";
import { Fragment } from "react";
import StaticTabMeasureLine from "~/components/Tab/Static/StaticTabMeasureLine";
import StaticTabNotesColumn from "~/components/Tab/Static/StaticTabNotesColumn";
import { PrettyVerticalTuning } from "~/components/ui/PrettyTuning";
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
  const { tuning } = useTabStore((state) => ({
    tuning: state.tuning,
  }));

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
      className="baseVertFlex lightestGlassmorphic relative h-full !justify-start rounded-md px-4 md:px-8"
    >
      <div className="baseFlex relative w-full flex-wrap !justify-start">
        <div
          style={{
            height: "168px",
            marginBottom: "-1px", // necessary anymore?
          }}
          className="baseVertFlex relative rounded-l-2xl border-2 border-pink-100 p-2"
        >
          <PrettyVerticalTuning tuning={tuning} height={"150px"} />
        </div>

        {subSectionData.data.map((column, index) => (
          <Fragment key={column[9]}>
            {column.includes("|") ? (
              <StaticTabMeasureLine columnData={column} />
            ) : (
              <StaticTabNotesColumn
                columnData={column}
                columnIndex={index}
                isFinalColumn={index === subSectionData.data.length - 1}
              />
            )}
          </Fragment>
        ))}
      </div>
    </motion.div>
  );
}

export default StaticTabSection;
