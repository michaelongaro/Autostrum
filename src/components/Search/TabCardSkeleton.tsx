import { motion } from "framer-motion";
import { Separator } from "~/components/ui/separator";

interface TabCardSkeleton {
  key: string;
  width?: number;
}

function TabCardSkeleton({ key, width }: TabCardSkeleton) {
  return (
    <motion.div
      key={key}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="lightestGlassmorphic baseVertFlex rounded-md border-2"
    >
      <div
        style={{
          width: width ?? "100%",
          height: width ? width / 2.17 : "9rem",
        }}
        className="animate-pulse rounded-t-sm bg-pink-300"
      ></div>

      <Separator />

      <div className="baseFlex w-full !items-end !justify-between gap-2">
        {/* title, date, and genre */}
        <div className="baseVertFlex mt-2 !items-start gap-2 pb-2 pl-2">
          <div className="h-8 w-48 animate-pulse rounded-md bg-pink-300"></div>
          <div className="baseFlex gap-2">
            <div className="h-5 w-16 animate-pulse rounded-md bg-pink-300"></div>
            <div className="h-5 w-12 animate-pulse rounded-md bg-pink-300"></div>
          </div>
        </div>

        {/* artist link & likes & play button */}
        <div className="baseFlex w-full !flex-nowrap !items-end !justify-between gap-2">
          {/* artist link */}
          <div className="baseFlex mb-1 w-1/2 !justify-start gap-2 pl-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-pink-300"></div>
            <div className="h-6 w-24 animate-pulse rounded-md bg-pink-300"></div>
          </div>

          <div className="baseFlex w-1/2 !flex-nowrap !justify-evenly rounded-tl-md border-l-2 border-t-2">
            {/* likes button */}
            <div className="h-8 w-full animate-pulse rounded-r-none rounded-bl-none rounded-tl-sm  bg-pink-300"></div>
            <Separator className="h-8 w-[1px]" />

            {/* play/pause button*/}
            <div className="h-8 w-full animate-pulse rounded-l-none rounded-br-sm rounded-tr-none  bg-pink-300"></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default TabCardSkeleton;
