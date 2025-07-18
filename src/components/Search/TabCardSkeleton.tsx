import { motion } from "framer-motion";
import { FaStar } from "react-icons/fa";
import { Separator } from "~/components/ui/separator";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

interface TabCardSkeleton {
  uniqueKey: string;
  largeVariant?: boolean;
}

function TabCardSkeleton({ uniqueKey, largeVariant }: TabCardSkeleton) {
  const isAboveExtraSmallViewportWidth = useViewportWidthBreakpoint(450);

  return (
    <motion.div
      key={uniqueKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="baseVertFlex !w-min rounded-md border bg-secondary-active/50 shadow-sm"
    >
      <div
        style={{
          width: largeVariant
            ? 398
            : isAboveExtraSmallViewportWidth
              ? 330
              : 270,
          height: largeVariant
            ? 185
            : isAboveExtraSmallViewportWidth
              ? 151
              : 129,
        }}
        className="pulseAnimation rounded-t-sm border-b bg-foreground/50"
      ></div>

      <div
        className={`baseVertFlex h-[94px] w-full !items-start gap-1 rounded-b-md p-2.5`}
      >
        {/* title */}
        <div className="pulseAnimation h-6 w-48 rounded-md bg-foreground/50"></div>

        {/* artist + difficulty */}
        <div className="baseFlex w-full !justify-between">
          <div className="pulseAnimation h-5 w-24 rounded-md bg-foreground/50"></div>
          <div className="pulseAnimation h-5 w-24 rounded-md bg-foreground/50"></div>
        </div>

        {/* genre + rating/date */}
        <div className="baseFlex w-full !justify-between">
          <div className="pulseAnimation h-5 w-16 rounded-full bg-foreground/50"></div>

          <div className="baseFlex gap-2">
            <div className="baseFlex gap-1">
              <div className="pulseAnimation h-4 w-8 rounded-md bg-foreground/50"></div>
              <FaStar className="size-3" />
              <div className="pulseAnimation h-4 w-8 rounded-md bg-foreground/50"></div>
            </div>

            <Separator
              className="h-[16px] w-[1px] bg-foreground/50"
              orientation="vertical"
            />

            <div className="pulseAnimation h-5 w-20 rounded-md bg-foreground/50"></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default TabCardSkeleton;
