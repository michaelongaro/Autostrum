import { motion } from "framer-motion";
import { FaStar } from "react-icons/fa";
import { Separator } from "~/components/ui/separator";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

interface TabCardSkeleton {
  uniqueKey: string;
  largeVariant?: boolean;
  hideArtist?: boolean;
  hideLikesAndPlayButtons?: boolean;
}

function TabCardSkeleton({
  uniqueKey,
  largeVariant,
  hideArtist,
  hideLikesAndPlayButtons,
}: TabCardSkeleton) {
  const isAboveExtraSmallViewportWidth = useViewportWidthBreakpoint(450);

  return (
    <motion.div
      key={uniqueKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="lightestGlassmorphic baseVertFlex !w-min rounded-md border-2"
    >
      <div
        style={{
          width: largeVariant
            ? 396
            : isAboveExtraSmallViewportWidth
              ? 330
              : 270,
          height: largeVariant
            ? 185
            : isAboveExtraSmallViewportWidth
              ? 151
              : 129,
        }}
        className="pulseAnimation rounded-t-sm bg-pink-300"
      ></div>

      <Separator className="bg-pink-100" />

      <div
        className={`baseVertFlex h-[90px] w-full !items-start gap-1 rounded-b-md p-2.5`}
      >
        {/* title */}
        <div className="pulseAnimation h-6 w-48 rounded-md bg-pink-300"></div>

        {/* artist + difficulty */}
        <div className="baseFlex w-full !justify-between">
          <div className="pulseAnimation h-5 w-16 rounded-md bg-pink-300"></div>
          <div className="pulseAnimation h-5 w-24 rounded-md bg-pink-300"></div>
        </div>

        {/* genre + rating/date */}
        <div className="baseFlex w-full !justify-between">
          <div className="pulseAnimation h-5 w-12 rounded-full bg-pink-300"></div>

          <div className="baseFlex gap-2">
            <div className="baseFlex gap-1">
              <div className="pulseAnimation h-4 w-8 rounded-md bg-pink-300"></div>
              <FaStar className="size-3" />
              <div className="pulseAnimation h-4 w-8 rounded-md bg-pink-300"></div>
            </div>

            <Separator
              className="h-[16px] w-[1px] bg-pink-100/50"
              orientation="vertical"
            />

            <div className="pulseAnimation h-5 w-20 rounded-md bg-pink-300"></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default TabCardSkeleton;
