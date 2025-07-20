import { useTabStore } from "~/stores/TabStore";
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

      <DialogContent
        className={`baseVertFlex max-h-[90dvh] ${editing ? "max-w-[300px]" : "max-w-[365px]"} !justify-start gap-4 overflow-y-auto rounded-lg px-2 xs:max-w-[450px] xs:p-4`}
      >
        <span className="baseFlex gap-2 font-semibold">
          <FaBook className="size-4" />
          Effect glossary
        </span>

        <div
          className={`baseFlex !items-start gap-4 xs:gap-8 ${editing ? "!flex-col xs:!flex-row" : ""}`}
        >
          <div
            className={`baseVertFlex gap-1 ${editing ? "min-w-[190px]" : "min-w-[150px]"}`}
          >
            <span className="mt-2 text-sm font-medium">Note effects</span>

            <Separator className="mb-2 w-full bg-primary" />

            <div className="baseVertFlex w-full gap-2">
              <div className="grid w-full grid-cols-5 pl-1 text-sm">
                <span className="col-span-1">h</span>
                <span className="col-span-1">-</span>
                <span className="baseFlex col-span-3 !justify-start gap-2">
                  Hammer-on
                  {editing && (
                    <Popover>
                      <PopoverTrigger className="rounded-md p-1 transition-all hover:bg-primary/20 active:bg-primary/10">
                        <HiOutlineInformationCircle className="h-5 w-5" />
                      </PopoverTrigger>
                      <PopoverContent
                        side={"bottom"}
                        className="baseVertFlex max-w-[300px] gap-1 text-sm md:max-w-none"
                      >
                        <div className="font-semibold">Notation variations</div>
                        <Separator className="mb-2 w-full bg-primary" />
                        <div className="baseFlex gap-4">
                          <div className="baseVertFlex gap-2">
                            <p>Standard</p>
                            <div className="baseFlex rounded-md border bg-secondary p-2">
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                3h
                              </div>
                              <div className="h-[1px] w-2 bg-foreground"></div>
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                5
                              </div>
                            </div>
                          </div>
                          <div className="baseVertFlex gap-2">
                            <p>Delayed</p>
                            <div className="baseFlex rounded-md border bg-secondary p-2">
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                3
                              </div>
                              <div className="h-[1px] w-2 bg-foreground"></div>
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                h
                              </div>
                              <div className="h-[1px] w-2 bg-foreground"></div>
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
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
                      <PopoverTrigger className="rounded-md p-1 transition-all hover:bg-primary/20 active:bg-primary/10">
                        <HiOutlineInformationCircle className="h-5 w-5" />
                      </PopoverTrigger>
                      <PopoverContent
                        side={"bottom"}
                        className="baseVertFlex max-w-[300px] gap-1 text-sm md:max-w-none"
                      >
                        <div className="font-semibold">Notation variations</div>
                        <Separator className="mb-2 w-full bg-primary" />
                        <div className="baseFlex gap-4">
                          <div className="baseVertFlex gap-2">
                            <p>Standard</p>
                            <div className="baseFlex rounded-md border bg-secondary p-2">
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                3p
                              </div>
                              <div className="h-[1px] w-2 bg-foreground"></div>
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                5
                              </div>
                            </div>
                          </div>
                          <div className="baseVertFlex gap-2">
                            <p>Delayed</p>
                            <div className="baseFlex rounded-md border bg-secondary p-2">
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                3
                              </div>
                              <div className="h-[1px] w-2 bg-foreground"></div>
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                p
                              </div>
                              <div className="h-[1px] w-2 bg-foreground"></div>
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
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
                      <PopoverTrigger className="rounded-md p-1 transition-all hover:bg-primary/20 active:bg-primary/10">
                        <HiOutlineInformationCircle className="h-5 w-5" />
                      </PopoverTrigger>
                      <PopoverContent
                        side={"bottom"}
                        className="baseVertFlex max-w-[300px] gap-1 text-sm md:max-w-none"
                      >
                        <div className="font-semibold">Notation variations</div>
                        <Separator className="mb-2 w-full bg-primary" />
                        <div className="baseFlex gap-4">
                          <div className="baseVertFlex gap-2">
                            <p>Standard</p>
                            <div className="baseFlex rounded-md border bg-secondary p-2">
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                3/
                              </div>
                              <div className="h-[1px] w-2 bg-foreground"></div>
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                5
                              </div>
                            </div>
                          </div>
                          <div className="baseVertFlex gap-2">
                            <p>Delayed</p>
                            <div className="baseFlex rounded-md border bg-secondary p-2">
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                3
                              </div>
                              <div className="h-[1px] w-2 bg-foreground"></div>
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                /
                              </div>
                              <div className="h-[1px] w-2 bg-foreground"></div>
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
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
                      <PopoverTrigger className="rounded-md p-1 transition-all hover:bg-primary/20 active:bg-primary/10">
                        <HiOutlineInformationCircle className="h-5 w-5" />
                      </PopoverTrigger>
                      <PopoverContent
                        side={"bottom"}
                        className="baseVertFlex max-w-[300px] gap-1 text-sm md:max-w-none"
                      >
                        <div className="font-semibold">Notation variations</div>
                        <Separator className="mb-2 w-full bg-primary" />
                        <div className="baseFlex gap-4">
                          <div className="baseVertFlex gap-2">
                            <p>Standard</p>
                            <div className="baseFlex rounded-md border bg-secondary p-2">
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                3\
                              </div>
                              <div className="h-[1px] w-2 bg-foreground"></div>
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                5
                              </div>
                            </div>
                          </div>
                          <div className="baseVertFlex gap-2">
                            <p>Delayed</p>
                            <div className="baseFlex rounded-md border bg-secondary p-2">
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                3
                              </div>
                              <div className="h-[1px] w-2 bg-foreground"></div>
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
                                \
                              </div>
                              <div className="h-[1px] w-2 bg-foreground"></div>
                              <div className="baseFlex h-9 w-9 rounded-full border text-sm text-foreground">
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
          </div>

          <div className="baseVertFlex w-full gap-1">
            <span className="mt-2 text-sm font-medium">Chord effects</span>
            <Separator className="mb-2 w-full bg-primary" />

            {editing ? (
              <div className="baseVertFlex w-full gap-2">
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1">^</span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Upstrum</span>
                </div>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1">v</span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Downstrum</span>
                </div>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1">{">"}</span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Accented</span>
                </div>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1">s</span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Slap</span>
                </div>
                <div className="grid w-full grid-cols-5 pl-1 text-sm">
                  <span className="col-span-1">.</span>
                  <span className="col-span-1">-</span>
                  <span className="col-span-3">Stacatto</span>
                </div>
              </div>
            ) : (
              <div className="baseVertFlex w-full gap-2">
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
              </div>
            )}

            <div className="baseVertFlex w-full gap-1">
              <span className="mt-4 text-sm font-medium">Section effects</span>
              <Separator className="mb-2 w-full bg-primary" />
            </div>

            <div className="grid w-full grid-cols-5 pl-1 text-sm">
              <span className="col-span-1">PM</span>
              <span className="col-span-1 ml-1">-</span>
              <span className="col-span-3">Palm mute</span>
            </div>

            {editing && (
              <>
                <div className="baseVertFlex w-full gap-1">
                  <span className="mt-4 text-sm font-medium">
                    Miscellaneous
                  </span>
                  <Separator className="mb-2 w-full bg-primary" />
                </div>

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
            <Separator className="w-full max-w-[300px] bg-primary xs:max-w-none" />
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
