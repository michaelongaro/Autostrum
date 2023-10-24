import { useRouter } from "next/router";
import { AiOutlineHeart } from "react-icons/ai";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";

import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import classes from "./TabMetadata.module.css";

interface TabSkeleton {
  editing: boolean;
}

function TabSkeleton({ editing }: TabSkeleton) {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);
  const { asPath } = useRouter();

  return (
    <div className="baseVertFlex lightGlassmorphic relative my-12 w-11/12 gap-4 rounded-md shadow-md md:my-24 xl:w-8/12">
      {editing && (
        <>
          <div className="baseVertFlex w-full gap-2">
            <div className="baseFlex w-full !justify-between p-4">
              <div className="baseFlex">
                {!asPath.includes("create") && (
                  <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
                )}
              </div>

              <div className="baseFlex gap-2">
                <>
                  {!asPath.includes("create") && (
                    <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
                  )}

                  <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>

                  <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>

                  <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
                </>
              </div>
            </div>
            <div className={classes.editingMetadataContainer}>
              <div
                className={`${
                  classes.title ?? ""
                } baseVertFlex w-full !items-start gap-1.5`}
              >
                <Label htmlFor="title">
                  Title <span className="text-brightRed">*</span>
                </Label>
                <div className="h-8 w-full animate-pulse rounded-md bg-pink-300"></div>
              </div>

              <div
                className={`${
                  classes.description ?? ""
                } baseVertFlex w-full !items-start gap-1.5`}
              >
                <Label htmlFor="description">Description</Label>
                <div className="h-8 w-full animate-pulse rounded-md bg-pink-300"></div>
              </div>

              <div
                className={`${
                  classes.genre ?? ""
                } baseVertFlex w-11/12 !items-start gap-1.5`}
              >
                <Label>
                  Genre <span className="text-brightRed">*</span>
                </Label>
                <div className="h-8 w-full animate-pulse rounded-md bg-pink-300"></div>
              </div>

              <div
                className={`${
                  classes.tuning ?? ""
                } baseVertFlex w-11/12 max-w-sm !items-start gap-1.5`}
              >
                <Label htmlFor="tuning">
                  Tuning <span className="text-brightRed">*</span>
                </Label>
                <div className="h-8 w-full animate-pulse rounded-md bg-pink-300"></div>
              </div>

              <div
                className={`${
                  classes.capo ?? ""
                } baseVertFlex w-16 max-w-sm !items-start gap-1.5`}
              >
                <Label htmlFor="capo">Capo</Label>
                <div className="h-8 w-full animate-pulse rounded-md bg-pink-300"></div>
              </div>

              <div
                className={`${
                  classes.bpm ?? ""
                } baseVertFlex relative w-16 max-w-sm !items-start gap-1.5`}
              >
                <Label htmlFor="bpm">
                  BPM <span className="text-brightRed">*</span>
                </Label>
                <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
              </div>

              <div
                className={`${
                  classes.timingSignature ?? ""
                } baseVertFlex w-16 max-w-sm !items-start gap-1.5`}
              >
                <Label htmlFor="timing">Timing</Label>
                <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
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

            <div className="h-36 w-full animate-pulse rounded-md bg-pink-300 "></div>
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

            <div className={classes.metadataContainer}>
              <div
                className={`${
                  classes.description ?? ""
                } baseVertFlex w-full !items-start gap-2`}
              >
                <div className="font-semibold">Description</div>
                <div className="h-12 w-full animate-pulse rounded-md bg-pink-300"></div>
              </div>

              <div className="baseVertFlex w-full gap-4 md:flex-row md:items-start md:gap-8">
                <div className="baseFlex w-full !items-start !justify-evenly gap-4 md:w-auto md:flex-row md:gap-8">
                  <div
                    className={`${
                      classes.genre ?? ""
                    } baseVertFlex !items-start gap-2`}
                  >
                    <div className="font-semibold">Genre</div>
                    <div className="h-10 w-24 animate-pulse rounded-md bg-pink-300"></div>
                  </div>
                  <div
                    className={`${
                      classes.tuning ?? ""
                    } baseVertFlex !items-start gap-2`}
                  >
                    <div className="font-semibold">Tuning</div>
                    <div className="h-10 w-24 animate-pulse rounded-md bg-pink-300"></div>
                  </div>
                </div>

                <div className="baseFlex w-full !items-start !justify-evenly md:w-auto md:flex-row md:gap-8">
                  <div
                    className={`${
                      classes.bpm ?? ""
                    } baseVertFlex !items-start gap-2`}
                  >
                    <div className="font-semibold">BPM</div>
                    <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
                  </div>

                  <div
                    className={`${
                      classes.timingSignature ?? ""
                    } baseVertFlex !items-start gap-2`}
                  >
                    <div className="font-semibold">Timing</div>
                    <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
                  </div>

                  {/* feels a bit weird with "none" option, but felt weird leaving so
                    much extra space */}
                  <div
                    className={`${
                      classes.capo ?? ""
                    } baseVertFlex !items-start gap-2`}
                  >
                    <p className="font-semibold">Capo</p>
                    <div className="h-8 w-16 animate-pulse rounded-md bg-pink-300"></div>
                  </div>
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
              className="h-20 w-1/2 max-w-[91.7%] animate-pulse rounded-md bg-pink-300"
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

          <div className="baseVertFlex w-full !items-start gap-4 p-6">
            <div className="h-12 w-48 animate-pulse rounded-md bg-pink-300"></div>
            <div className="h-36 w-full animate-pulse rounded-md bg-pink-300 "></div>
            <div className="h-36 w-full animate-pulse rounded-md bg-pink-300 "></div>
            <div className="h-36 w-full animate-pulse rounded-md bg-pink-300 "></div>
          </div>
        </>
      )}
    </div>
  );
}

export default TabSkeleton;
