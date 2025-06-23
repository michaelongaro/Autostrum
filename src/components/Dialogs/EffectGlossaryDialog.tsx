import { useTabStore } from "~/stores/TabStore";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import { HiOutlineInformationCircle } from "react-icons/hi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { FaBook } from "react-icons/fa";

function EffectGlossaryDialog() {
  const { editing, showEffectGlossaryDialog, setShowEffectGlossaryDialog } =
    useTabStore((state) => ({
      editing: state.editing,
      showEffectGlossaryDialog: state.showEffectGlossaryDialog,
      setShowEffectGlossaryDialog: state.setShowEffectGlossaryDialog,
    }));

  return (
    <Dialog
      onOpenChange={(open) => {
        setShowEffectGlossaryDialog(open);
      }}
      open={showEffectGlossaryDialog}
    >
      <VisuallyHidden>
        <DialogTitle>Effect glossary</DialogTitle>
        <DialogDescription>
          A list of all the effects and their notations that can be used in the
          tab editor.
        </DialogDescription>
      </VisuallyHidden>

      <DialogContent className="baseVertFlex max-h-[90dvh] max-w-[350px] !justify-start gap-4 overflow-y-auto rounded-lg bg-pink-100 px-2 text-pink-950 xs:max-w-[450px] xs:p-4">
        <p className="baseFlex gap-2 font-semibold">
          <FaBook className="size-4" />
          Effect glossary
        </p>

        <div
          className={`baseFlex !items-start gap-4 xs:gap-8 ${editing ? "!flex-col xs:!flex-row" : ""}`}
        >
          <div
            className={`baseVertFlex gap-2 ${editing ? "min-w-[190px]" : "min-w-[150px]"}`}
          >
            <Label className="mt-2">Note effects</Label>
            <Separator className="mb-2 w-full bg-pink-600" />

            <div className="grid w-full grid-cols-5 pl-1 text-sm">
              <span className="col-span-1">h</span>
              <span className="col-span-1">-</span>
              <span className="baseFlex col-span-3 !justify-start gap-2">
                Hammer-on
                {editing && (
                  <Popover>
                    <PopoverTrigger className="rounded-md p-1 transition-all hover:bg-pink-500/20 active:bg-pink-500/10">
                      <HiOutlineInformationCircle className="h-5 w-5" />
                    </PopoverTrigger>
                    <PopoverContent
                      side={"bottom"}
                      className="baseVertFlex max-w-[300px] gap-1 text-sm md:max-w-none"
                    >
                      <div className="font-semibold">Notation variations</div>
                      <Separator className="mb-2 w-full bg-pink-600" />
                      <div className="baseFlex gap-4">
                        <div className="baseVertFlex gap-2">
                          <p>Standard</p>
                          <div className="baseFlex lightestGlassmorphic rounded-md p-2">
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              3h
                            </div>
                            <div className="h-[1px] w-2 bg-pink-100"></div>
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              5
                            </div>
                          </div>
                        </div>
                        <div className="baseVertFlex gap-2">
                          <p>Delayed</p>
                          <div className="baseFlex lightestGlassmorphic rounded-md p-2">
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              3
                            </div>
                            <div className="h-[1px] w-2 bg-pink-100"></div>
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              h
                            </div>
                            <div className="h-[1px] w-2 bg-pink-100"></div>
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              5
                            </div>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </span>
            </div>
            <div className="grid w-full grid-cols-5 pl-1 text-sm">
              <span className="col-span-1">p</span>
              <span className="col-span-1">-</span>
              <span className="baseFlex col-span-3 !justify-start gap-2">
                Pull-off
                {editing && (
                  <Popover>
                    <PopoverTrigger className="rounded-md p-1 transition-all hover:bg-pink-500/20 active:bg-pink-500/10">
                      <HiOutlineInformationCircle className="h-5 w-5" />
                    </PopoverTrigger>
                    <PopoverContent
                      side={"bottom"}
                      className="baseVertFlex max-w-[300px] gap-1 text-sm md:max-w-none"
                    >
                      <div className="font-semibold">Notation variations</div>
                      <Separator className="mb-2 w-full bg-pink-600" />
                      <div className="baseFlex gap-4">
                        <div className="baseVertFlex gap-2">
                          <p>Standard</p>
                          <div className="baseFlex lightestGlassmorphic rounded-md p-2">
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              3p
                            </div>
                            <div className="h-[1px] w-2 bg-pink-100"></div>
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              5
                            </div>
                          </div>
                        </div>
                        <div className="baseVertFlex gap-2">
                          <p>Delayed</p>
                          <div className="baseFlex lightestGlassmorphic rounded-md p-2">
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              3
                            </div>
                            <div className="h-[1px] w-2 bg-pink-100"></div>
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              p
                            </div>
                            <div className="h-[1px] w-2 bg-pink-100"></div>
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              5
                            </div>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </span>
            </div>
            <div className="grid w-full grid-cols-5 pl-1 text-sm">
              <span className="col-span-1">/</span>
              <span className="col-span-1">-</span>
              <span className="baseFlex col-span-3 !justify-start gap-2">
                Slide up
                {editing && (
                  <Popover>
                    <PopoverTrigger className="rounded-md p-1 transition-all hover:bg-pink-500/20 active:bg-pink-500/10">
                      <HiOutlineInformationCircle className="h-5 w-5" />
                    </PopoverTrigger>
                    <PopoverContent
                      side={"bottom"}
                      className="baseVertFlex max-w-[300px] gap-1 text-sm md:max-w-none"
                    >
                      <div className="font-semibold">Notation variations</div>
                      <Separator className="mb-2 w-full bg-pink-600" />
                      <div className="baseFlex gap-4">
                        <div className="baseVertFlex gap-2">
                          <p>Standard</p>
                          <div className="baseFlex lightestGlassmorphic rounded-md p-2">
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              3/
                            </div>
                            <div className="h-[1px] w-2 bg-pink-100"></div>
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              5
                            </div>
                          </div>
                        </div>
                        <div className="baseVertFlex gap-2">
                          <p>Delayed</p>
                          <div className="baseFlex lightestGlassmorphic rounded-md p-2">
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              3
                            </div>
                            <div className="h-[1px] w-2 bg-pink-100"></div>
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              /
                            </div>
                            <div className="h-[1px] w-2 bg-pink-100"></div>
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              5
                            </div>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </span>
            </div>
            <div className="grid w-full grid-cols-5 pl-1 text-sm">
              <span className="col-span-1">\</span>
              <span className="col-span-1">-</span>
              <span className="baseFlex col-span-3 !justify-start gap-2">
                Slide down
                {editing && (
                  <Popover>
                    <PopoverTrigger className="rounded-md p-1 transition-all hover:bg-pink-500/20 active:bg-pink-500/10">
                      <HiOutlineInformationCircle className="h-5 w-5" />
                    </PopoverTrigger>
                    <PopoverContent
                      side={"bottom"}
                      className="baseVertFlex max-w-[300px] gap-1 text-sm md:max-w-none"
                    >
                      <div className="font-semibold">Notation variations</div>
                      <Separator className="mb-2 w-full bg-pink-600" />
                      <div className="baseFlex gap-4">
                        <div className="baseVertFlex gap-2">
                          <p>Standard</p>
                          <div className="baseFlex lightestGlassmorphic rounded-md p-2">
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              3\
                            </div>
                            <div className="h-[1px] w-2 bg-pink-100"></div>
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              5
                            </div>
                          </div>
                        </div>
                        <div className="baseVertFlex gap-2">
                          <p>Delayed</p>
                          <div className="baseFlex lightestGlassmorphic rounded-md p-2">
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              3
                            </div>
                            <div className="h-[1px] w-2 bg-pink-100"></div>
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              \
                            </div>
                            <div className="h-[1px] w-2 bg-pink-100"></div>
                            <div className="baseFlex h-9 w-9 rounded-full border-2 border-pink-100 text-sm text-pink-100">
                              5
                            </div>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </span>
            </div>
            {editing && (
              <div className="grid w-full grid-cols-5 pl-1 text-sm">
                <span className="col-span-1">{">"}</span>
                <span className="col-span-1">-</span>
                <span className="col-span-3">Accented</span>
              </div>
            )}
            <div className="grid w-full grid-cols-5 pl-1 text-sm">
              <span className="col-span-1">~</span>
              <span className="col-span-1">-</span>
              <span className="col-span-3">Vibrato</span>
            </div>
            <div className="grid w-full grid-cols-5 pl-1 text-sm">
              <span
                className={`col-span-1 ${editing ? "" : "relative bottom-[8.5px] text-[30px]"}`}
              >
                .
              </span>
              <span className="col-span-1">-</span>
              <span className="col-span-3">Stacatto</span>
            </div>
            <div className="grid w-full grid-cols-5 pl-1 text-sm">
              <span className="col-span-1">b</span>
              <span className="col-span-1">-</span>
              <span className="col-span-3">Bend</span>
            </div>
            <div className="grid w-full grid-cols-5 pl-1 text-sm">
              <span className="col-span-1">r</span>
              <span className="col-span-1">-</span>
              <span className="col-span-3">Release</span>
            </div>
            <div className="grid w-full grid-cols-5 pl-1 text-sm">
              <span className="col-span-1">x</span>
              <span className="col-span-1">-</span>
              <span className="col-span-3">Muted note</span>
            </div>
          </div>

          <div className="baseVertFlex w-full gap-2">
            <Label className="mt-2">Chord effects</Label>
            <Separator className="mb-2 w-full bg-pink-600" />

            {editing ? (
              <>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1">^</span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Strum up</span>
                </div>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1">v</span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Strum down</span>
                </div>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1">s</span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Slap</span>
                </div>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1">{">"}</span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Accented</span>
                </div>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1">.</span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Stacatto</span>
                </div>
              </>
            ) : (
              <>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1 -ml-1">
                    <BsArrowUp className="size-4" />
                  </span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Strum up</span>
                </div>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1 -ml-1">
                    <BsArrowDown className="size-4" />
                  </span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Strum down</span>
                </div>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1">s</span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Slap</span>
                </div>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="relative bottom-[9px] col-span-1 text-[30px]">
                    .
                  </span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Stacatto</span>
                </div>
              </>
            )}

            <Label className="mt-4">Section effects</Label>
            <Separator className="mb-2 w-full bg-pink-600" />

            <div className="grid w-full grid-cols-5 pl-1 text-sm">
              <span className="col-span-1">PM</span>
              <span className="col-span-1 ml-1">-</span>
              <span className="col-span-3">Palm mute</span>
            </div>

            {editing && (
              <>
                <Label className="mt-4">Miscellaneous</Label>
                <Separator className="mb-2 w-full bg-pink-600" />

                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1">|</span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3 whitespace-nowrap text-nowrap">
                    Measure line
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {!editing && (
          <div className="baseVertFlex w-full gap-2">
            <div className="h-[1px] w-full max-w-[300px] bg-black xs:max-w-none"></div>
            <p className="text-sm">
              <span className="font-semibold">Bolded</span> effects are
              accented.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default EffectGlossaryDialog;
