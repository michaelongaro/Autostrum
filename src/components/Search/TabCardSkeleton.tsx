import { motion } from "framer-motion";
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
            ? 313
            : 266,
          height: largeVariant
            ? 185
            : isAboveExtraSmallViewportWidth
            ? 146
            : 124,
        }}
        className="animate-pulse rounded-t-sm bg-pink-300"
      ></div>

      <Separator />

      <div
        className={`baseFlex w-full !items-end !justify-between ${
          hideArtist ? "" : "gap-2"
        }`}
      >
        {/* title, date, and genre */}
        <div className="baseVertFlex mt-2 !items-start gap-2 pb-1 pl-2">
          <div className="h-6 w-48 animate-pulse rounded-md bg-pink-300"></div>
          <div className="baseFlex gap-2">
            <div className="h-5 w-16 animate-pulse rounded-md bg-pink-300"></div>
            <div className="h-5 w-12 animate-pulse rounded-md bg-pink-300"></div>
          </div>
        </div>

        {/* artist link & likes & play button */}
        <div
          className={`baseFlex w-full !flex-nowrap !items-end ${
            hideArtist ? "!justify-end" : "!justify-between"
          } gap-2`}
        >
          {/* artist link */}
          {!hideArtist && (
            <div
              className={`baseFlex w-1/2 !flex-nowrap !justify-start gap-2 pl-2 ${
                hideLikesAndPlayButtons ? "" : "mb-1"
              }`}
            >
              <div className="h-8 w-8 animate-pulse rounded-full bg-pink-300"></div>
              <div className="h-6 w-20 animate-pulse rounded-md bg-pink-300"></div>
            </div>
          )}

          {!hideLikesAndPlayButtons ? (
            <div className="baseFlex w-1/2 !flex-nowrap !justify-evenly rounded-tl-md border-l-2 border-t-2">
              {/* likes button */}
              <div className="h-8 w-full animate-pulse rounded-r-none rounded-bl-none rounded-tl-sm  bg-pink-300"></div>
              <Separator className="h-8 w-[1px]" />

              {/* play/pause button*/}
              <div className="h-8 w-full animate-pulse rounded-l-none rounded-br-sm rounded-tr-none  bg-pink-300"></div>
            </div>
          ) : (
            <div className="mb-1 mr-2 h-9 w-20 animate-pulse rounded-md bg-pink-300"></div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default TabCardSkeleton;
