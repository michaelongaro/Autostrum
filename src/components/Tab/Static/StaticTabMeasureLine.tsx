import { motion } from "framer-motion";
import { Fragment } from "react";
import { QuarterNote } from "~/utils/bpmIconRenderingHelpers";

interface StaticTabMeasureLine {
  columnData: string[];
}

function StaticTabMeasureLine({ columnData }: StaticTabMeasureLine) {
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
                  className={`baseFlex absolute !flex-nowrap gap-[0.125rem] text-pink-100 ${
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
                  <div className="relative top-[-17px] h-[1px] w-full bg-pink-100"></div>
                )}
              </div>
            </>
          )}

          {index > 0 && index < 7 && (
            <div className="baseFlex w-full">
              <div className="h-[28px] w-[2px] bg-pink-100"></div>
            </div>
          )}
        </Fragment>
      ))}
    </motion.div>
  );
}

export default StaticTabMeasureLine;
