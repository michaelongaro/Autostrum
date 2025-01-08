import { AiOutlineHeart } from "react-icons/ai";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { motion } from "framer-motion";

import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import classes from "./TabMetadata.module.css";
import { QuarterNote } from "~/utils/bpmIconRenderingHelpers";

const opacityVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface TabSkeleton {
  editing: boolean;
}

function TabSkeleton({ editing }: TabSkeleton) {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  return (
    <motion.div
      key={"tabSkeletonBeingViewed"}
      variants={opacityVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      transition={{ duration: 0.5 }}
      className="baseVertFlex lightGlassmorphic relative my-12 w-11/12 gap-4 rounded-md md:my-24 2xl:w-8/12"
    >
      {editing && (
        <>
          <div className="baseVertFlex w-full gap-2">
            <div className="baseFlex w-full !justify-end gap-2 p-4">
              <div className="h-8 w-28 animate-pulse rounded-md bg-pink-300"></div>
              <div className="h-8 w-28 animate-pulse rounded-md bg-pink-300"></div>
              <div className="h-8 w-20 animate-pulse rounded-md bg-pink-300"></div>
            </div>

            <div className={classes.editingMetadataContainer}>
              <div
                className={`${
                  classes.title ?? ""
                } baseVertFlex w-full !items-start gap-1.5`}
              >
                <Label htmlFor="title">
                  Title <span className="text-destructiveRed">*</span>
                </Label>
                <div className="h-8 w-full max-w-72 animate-pulse rounded-md bg-pink-300"></div>
              </div>

              <div
                className={`${
                  classes.description ?? ""
                } baseVertFlex w-full !items-start gap-1.5`}
              >
                <Label htmlFor="description">Description</Label>
                <div className="h-16 w-full animate-pulse rounded-md bg-pink-300"></div>
              </div>

              <div
                className={`${
                  classes.genre ?? ""
                } baseVertFlex w-11/12 !items-start gap-1.5`}
              >
                <Label>
                  Genre <span className="text-destructiveRed">*</span>
                </Label>
                <div className="h-8 w-[180px] animate-pulse rounded-md bg-pink-300"></div>
              </div>

              <div
                className={`${
                  classes.tuning ?? ""
                } baseVertFlex w-11/12 max-w-sm !items-start gap-1.5`}
              >
                <Label htmlFor="tuning">
                  Tuning <span className="text-destructiveRed">*</span>
                </Label>
                <div className="h-8 w-[180px] animate-pulse rounded-md bg-pink-300"></div>
              </div>

              <div
                className={`${
                  classes.capo ?? ""
                } baseVertFlex w-16 max-w-sm !items-start gap-1.5`}
              >
                <Label htmlFor="capo">Capo</Label>
                <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
              </div>

              <div
                className={`${
                  classes.bpm ?? ""
                } baseVertFlex relative w-16 max-w-sm !items-start gap-1.5`}
              >
                <Label htmlFor="bpm">
                  Tempo <span className="text-destructiveRed">*</span>
                </Label>
                <div className="baseFlex">
                  <QuarterNote className="-ml-1 size-5" />
                  <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
                  <span className="ml-1">BPM</span>
                </div>
              </div>
            </div>
          </div>
          <Separator className="w-[96%]" />
          <div className="baseVertFlex relative w-full gap-4">
            <div
              style={{
                minWidth: aboveMediumViewportWidth ? "500px" : "300px",
              }}
              className="h-28 w-1/2 max-w-[91.7%] animate-pulse rounded-md bg-pink-300"
            ></div>
            <div
              style={{
                minWidth: aboveMediumViewportWidth ? "500px" : "300px",
              }}
              className="h-28 w-1/2 max-w-[91.7%] animate-pulse rounded-md bg-pink-300"
            ></div>
            <div
              style={{
                minWidth: aboveMediumViewportWidth ? "500px" : "300px",
              }}
              className="h-28 w-1/2 max-w-[91.7%] animate-pulse rounded-md bg-pink-300"
            ></div>

            <div className="h-10 w-36 animate-pulse rounded-md bg-pink-300 lg:absolute lg:right-7 lg:top-0"></div>
          </div>
          <Separator className="w-[96%]" />
          <div className="baseVertFlex w-full gap-4 p-6">
            <div className="relative w-full">
              <div className="baseFlex w-full !justify-start gap-2">
                <Label className="text-lg font-semibold">Title</Label>
                <div className="h-8 w-28 animate-pulse rounded-md bg-pink-300"></div>
              </div>
            </div>

            <div className="h-36 w-full animate-pulse rounded-md bg-pink-300"></div>

            <div className="baseFlex gap-4">
              <div className="h-10 w-24 animate-pulse rounded-md bg-pink-300"></div>
              <div className="h-10 w-28 animate-pulse rounded-md bg-pink-300"></div>
            </div>
          </div>
          <Separator className="w-[96%]" />

          <div className="baseFlex my-8 gap-4">
            <div className="h-10 w-40 animate-pulse rounded-md bg-pink-300"></div>
          </div>
        </>
      )}

      {!editing && (
        <>
          <div className="min-h-[100px] w-full">
            <div
              className={`${
                classes.headerInfo ?? ""
              } w-full rounded-t-md bg-pink-700 !px-4 shadow-md md:!px-6`}
            >
              {aboveMediumViewportWidth ? (
                <div className="baseFlex w-full !justify-between">
                  <div className="baseFlex gap-2">
                    <div className="baseFlex gap-2">
                      <div className="text-2xl font-bold">
                        <div className="h-8 w-52 animate-pulse rounded-md bg-pink-300"></div>
                      </div>

                      <Button
                        variant={"ghost"}
                        disabled
                        className="baseFlex gap-2 p-2"
                      >
                        <AiOutlineHeart className="h-6 w-6" />
                      </Button>
                    </div>

                    <Separator orientation="vertical" className="h-8" />

                    <div className="baseFlex gap-2">
                      <div className="baseFlex gap-2">
                        <div className="h-8 w-8 animate-pulse rounded-full bg-pink-300"></div>
                        <div className="h-8 w-32 animate-pulse rounded-md bg-pink-300"></div>
                      </div>
                      <Separator className="h-[1px] w-4" />
                      <div className="h-8 w-20 animate-pulse rounded-md bg-pink-300"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="baseVertFlex relative w-full !items-start gap-2">
                  <div className="baseVertFlex !items-start gap-4">
                    <div className="h-8 w-52 animate-pulse rounded-md bg-pink-300"></div>

                    <div className="baseVertFlex !items-start gap-2">
                      <div className="baseFlex gap-2">
                        <div className="h-8 w-8 animate-pulse rounded-full bg-pink-300"></div>
                        <div className="h-7 w-32 animate-pulse rounded-md bg-pink-300"></div>
                      </div>
                      <div className="h-5 w-32 animate-pulse rounded-md bg-pink-300"></div>
                    </div>
                  </div>

                  <div className="baseFlex absolute bottom-0 right-0 w-full !justify-end">
                    <Button variant={"ghost"} disabled className="baseFlex p-0">
                      <AiOutlineHeart className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="baseVertFlex w-full gap-4 p-4 xl:!flex-row xl:!items-start xl:gap-6">
              <div className="baseVertFlex h-full w-full !items-start gap-4 sm:!flex-row sm:!justify-start sm:gap-6 xl:w-[50%]">
                <div className="baseFlex !items-start !justify-start gap-6">
                  <div className="baseVertFlex !items-start gap-2">
                    <div className="font-semibold">Genre</div>
                    <div className="h-8 w-[145px] animate-pulse rounded-md bg-pink-300"></div>
                  </div>

                  <div className="baseVertFlex !items-start gap-2">
                    <div className="font-semibold">Tuning</div>
                    <div className="h-8 w-[145px] animate-pulse rounded-md bg-pink-300"></div>
                  </div>
                </div>

                <div className="baseFlex !items-start !justify-start gap-6">
                  <div className="baseVertFlex !items-start gap-2">
                    <div className="font-semibold">Tempo</div>
                    <div className="baseFlex">
                      <QuarterNote className="-ml-1 size-5" />
                      <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
                      <span className="ml-1">BPM</span>
                    </div>
                  </div>

                  <div className="baseVertFlex ml-[58px] !items-start gap-2 sm:ml-0">
                    <p className="font-semibold">Capo</p>
                    <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
                  </div>
                </div>
              </div>

              <Separator
                orientation="vertical"
                className="hidden h-32 w-[1px] xl:block"
              />

              <div className="baseVertFlex w-full max-w-3xl !items-start gap-2 !self-start xl:w-[50%]">
                <div className="font-semibold">Description</div>
                <div className="h-16 w-full animate-pulse rounded-md bg-pink-300"></div>
              </div>
            </div>
          </div>

          <Separator className="w-[96%]" />

          <div className="baseVertFlex relative w-full gap-4">
            <div
              style={{
                minWidth: aboveMediumViewportWidth ? "500px" : "300px",
              }}
              className="h-16 w-1/2 max-w-[91.7%] animate-pulse rounded-md bg-pink-300 sm:h-24"
            ></div>
            <div
              style={{
                minWidth: aboveMediumViewportWidth ? "500px" : "300px",
              }}
              className="h-16 w-1/2 max-w-[91.7%] animate-pulse rounded-md bg-pink-300 sm:h-24"
            ></div>
            <div
              style={{
                minWidth: aboveMediumViewportWidth ? "500px" : "300px",
              }}
              className="h-16 w-1/2 max-w-[91.7%] animate-pulse rounded-md bg-pink-300 sm:h-24"
            ></div>

            <div className="h-10 w-36 animate-pulse rounded-md bg-pink-300 lg:absolute lg:right-7 lg:top-0"></div>
          </div>
          <Separator className="w-[96%]" />

          <div className="baseVertFlex w-full !items-start gap-4 p-6 pt-0">
            <div className="h-12 w-48 animate-pulse rounded-md bg-pink-300"></div>
            <div className="h-36 w-full animate-pulse rounded-md bg-pink-300"></div>
            <div className="h-36 w-full animate-pulse rounded-md bg-pink-300"></div>
            <div className="h-36 w-full animate-pulse rounded-md bg-pink-300"></div>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default TabSkeleton;
