import { useTabStore } from "~/stores/TabStore";
import { Separator } from "~/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "~/components/ui/table";
import {
  EighthNote,
  EighthRest,
  HalfNote,
  HalfRest,
  QuarterNote,
  QuarterRest,
  SixteenthNote,
  SixteenthRest,
  WholeNote,
  WholeRest,
} from "~/utils/noteLengthIcons";

function GlossaryDialog() {
  const { editing, showGlossaryDialog, setShowGlossaryDialog } = useTabStore(
    (state) => ({
      editing: state.editing,
      showGlossaryDialog: state.showGlossaryDialog,
      setShowGlossaryDialog: state.setShowGlossaryDialog,
    }),
  );

  const [currentPane, setCurrentPane] = useState<"effects" | "noteLengths">(
    "effects",
  );

  const targetMinHeight =
    currentPane === "effects" ? (editing ? "408px" : "350px") : "408px";

  return (
    <Dialog
      onOpenChange={(open) => {
        setShowGlossaryDialog(open);

        if (!open) {
          setTimeout(() => {
            setCurrentPane("effects");
          }, 175);
        }
      }}
      open={showGlossaryDialog}
    >
      <VisuallyHidden>
        <DialogTitle>Effect glossary</DialogTitle>
        <DialogDescription>
          A list of all the effects and their notations that can be used in the
          tab editor.
        </DialogDescription>
      </VisuallyHidden>

      <DialogContent className="baseVertFlex max-h-[90dvh] max-w-[350px] !justify-start gap-4 rounded-lg p-4 transition-all xs:max-w-[420px]">
        <div className="baseFlex w-full !justify-start gap-4">
          <Button
            variant={"text"}
            onClick={() => setCurrentPane("effects")}
            className="relative h-8 px-0"
          >
            <span className="baseFlex gap-2 font-semibold">
              Effect Glossary
            </span>
            {currentPane === "effects" && (
              <motion.span
                layoutId="glossaryActiveTabUnderline"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                className="absolute bottom-[0px] left-0 z-0 h-[2px] w-full rounded-full bg-primary"
              />
            )}
          </Button>

          <Button
            variant={"text"}
            onClick={() => setCurrentPane("noteLengths")}
            className="relative h-8 px-0"
          >
            <span className="baseFlex gap-2 font-semibold">Note Lengths</span>
            {currentPane === "noteLengths" && (
              <motion.span
                layoutId="glossaryActiveTabUnderline"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                className="absolute bottom-[0px] left-0 z-0 h-[2px] w-full rounded-full bg-primary"
              />
            )}
          </Button>
        </div>

        <motion.div
          animate={{ height: targetMinHeight }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="w-full overflow-y-auto overflow-x-hidden xs:overflow-y-hidden"
        >
          <AnimatePresence mode="wait" initial={false}>
            {currentPane === "effects" && (
              <motion.div
                key={"GlossaryDialogEffectsPane"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={`baseVertFlex w-full !justify-start gap-4 ${editing ? "h-[408px]" : "h-[350px]"}`}
              >
                <div
                  className={`baseFlex !items-start gap-4 xs:gap-8 ${editing ? "!flex-col xs:!flex-row" : ""}`}
                >
                  <div
                    className={`baseVertFlex gap-1 ${editing ? "min-w-[190px]" : "min-w-[150px]"}`}
                  >
                    <span className="mt-2 text-sm font-medium">
                      Note effects
                    </span>

                    <Separator className="mb-2 w-full bg-primary" />

                    <div className="baseVertFlex w-full gap-2">
                      <div className="grid w-full grid-cols-5 pl-1 text-sm">
                        <span className="col-span-1">h</span>
                        <span className="col-span-1">-</span>
                        <span className="baseFlex col-span-3 !justify-start gap-2">
                          Hammer-on
                          {editing && (
                            <Popover>
                              <PopoverTrigger className="rounded-md p-1 transition-colors hover:bg-primary/20 active:bg-primary/10">
                                <HiOutlineInformationCircle className="h-5 w-5" />
                              </PopoverTrigger>
                              <PopoverContent
                                side={"bottom"}
                                className="baseVertFlex max-w-[300px] gap-1 text-sm md:max-w-none"
                              >
                                <div className="font-semibold">
                                  Notation variations
                                </div>
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
                              <PopoverTrigger className="rounded-md p-1 transition-colors hover:bg-primary/20 active:bg-primary/10">
                                <HiOutlineInformationCircle className="h-5 w-5" />
                              </PopoverTrigger>
                              <PopoverContent
                                side={"bottom"}
                                className="baseVertFlex max-w-[300px] gap-1 text-sm md:max-w-none"
                              >
                                <div className="font-semibold">
                                  Notation variations
                                </div>
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
                              <PopoverTrigger className="rounded-md p-1 transition-colors hover:bg-primary/20 active:bg-primary/10">
                                <HiOutlineInformationCircle className="h-5 w-5" />
                              </PopoverTrigger>
                              <PopoverContent
                                side={"bottom"}
                                className="baseVertFlex max-w-[300px] gap-1 text-sm md:max-w-none"
                              >
                                <div className="font-semibold">
                                  Notation variations
                                </div>
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
                              <PopoverTrigger className="rounded-md p-1 transition-colors hover:bg-primary/20 active:bg-primary/10">
                                <HiOutlineInformationCircle className="h-5 w-5" />
                              </PopoverTrigger>
                              <PopoverContent
                                side={"bottom"}
                                className="baseVertFlex max-w-[300px] gap-1 text-sm md:max-w-none"
                              >
                                <div className="font-semibold">
                                  Notation variations
                                </div>
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
                    <span className="mt-2 text-sm font-medium">
                      Chord effects
                    </span>
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
                        <div className="grid w-full grid-cols-5 pl-1 text-sm">
                          <span className="col-span-1">r</span>
                          <span className="col-span-1">-</span>
                          <span className="col-span-3">Rest</span>
                        </div>
                      </div>
                    ) : (
                      <div className="baseVertFlex w-full gap-2">
                        <div className="grid w-full grid-cols-5 pl-1 text-sm">
                          <span className="col-span-1 -ml-1">
                            <BsArrowUp className="size-4" />
                          </span>
                          <span className="col-span-1">-</span>
                          <span className="col-span-3">Upstrum</span>
                        </div>
                        <div className="grid w-full grid-cols-5 pl-1 text-sm">
                          <span className="col-span-1 -ml-1">
                            <BsArrowDown className="size-4" />
                          </span>
                          <span className="col-span-1">-</span>
                          <span className="col-span-3">Downstrum</span>
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
                        <div className="grid w-full grid-cols-5 pl-1 text-sm">
                          <span className="col-span-1">
                            <PauseIcon className="mt-1.5 size-2.5" />
                          </span>
                          <span className="col-span-1">-</span>
                          <span className="col-span-3">Rest</span>
                        </div>
                      </div>
                    )}

                    <div className="baseVertFlex w-full gap-1">
                      <span className="mt-4 text-sm font-medium">
                        Section effects
                      </span>
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

                <div className="baseVertFlex mt-2 w-full gap-2 xs:mt-0">
                  <Separator className="h-[1px] w-full bg-primary" />
                  <p className="text-sm">
                    <span className="font-semibold">Bolded</span> effects are
                    accented.
                  </p>
                </div>
              </motion.div>
            )}

            {currentPane === "noteLengths" && (
              <motion.div
                key={"GlossaryDialogNoteLengthsPane"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="baseVertFlex min-h-[408px] w-full !items-start gap-4 xs:gap-4"
              >
                <div className="baseVertFlex !items-start gap-0">
                  <div className="baseVertFlex gap-1">
                    <p className="text-sm font-medium">
                      Supported note lengths
                    </p>
                    <Separator className="mb-2 w-full bg-primary" />
                  </div>

                  <Table className="w-[300px] xs:w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-0">Name</TableHead>
                        <TableHead className="px-0">Duration</TableHead>
                        <TableHead className="px-0">Notation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="px-0 font-medium">
                          Whole
                        </TableCell>
                        <TableCell className="px-0">Four beats</TableCell>
                        <TableCell className="px-0">
                          <div className="baseFlex !justify-start gap-4">
                            <WholeNote className="scale-150" />
                            <Separator
                              orientation="vertical"
                              className="h-4 w-[1px] bg-foreground/25"
                            />
                            <WholeRest />
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="px-0 font-medium">Half</TableCell>
                        <TableCell className="px-0">Two beats</TableCell>
                        <TableCell className="px-0">
                          <div className="baseFlex !justify-start gap-4">
                            <HalfNote />

                            <Separator
                              orientation="vertical"
                              className="h-4 w-[1px] bg-foreground/25"
                            />
                            <div className="h-2 w-[1px] bg-foreground"></div>
                            <Separator
                              orientation="vertical"
                              className="h-4 w-[1px] bg-foreground/25"
                            />
                            <HalfRest />
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="px-0 font-medium">
                          Quarter
                        </TableCell>
                        <TableCell className="px-0">One beat</TableCell>
                        <TableCell className="px-0">
                          <div className="baseFlex !justify-start gap-4">
                            <QuarterNote />
                            <Separator
                              orientation="vertical"
                              className="h-4 w-[1px] bg-foreground/25"
                            />
                            <div className="h-4 w-[1px] bg-foreground"></div>
                            <Separator
                              orientation="vertical"
                              className="h-4 w-[1px] bg-foreground/25"
                            />
                            <QuarterRest />
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="px-0 font-medium">
                          Eighth
                        </TableCell>
                        <TableCell className="px-0">1/2 beat</TableCell>
                        <TableCell className="px-0">
                          <div className="baseFlex !justify-start gap-4">
                            <EighthNote />
                            <Separator
                              orientation="vertical"
                              className="h-4 w-[1px] bg-foreground/25"
                            />
                            <div className="baseFlex relative !items-end">
                              <div className="h-4 w-[1px] bg-foreground"></div>
                              <div className="absolute bottom-0 left-0 h-[3px] w-2 bg-foreground"></div>
                            </div>
                            <Separator
                              orientation="vertical"
                              className="h-4 w-[1px] bg-foreground/25"
                            />
                            <EighthRest />
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="px-0 font-medium">
                          Sixteenth
                        </TableCell>
                        <TableCell className="px-0">1/4 beat</TableCell>
                        <TableCell className="px-0">
                          <div className="baseFlex !justify-start gap-4">
                            <SixteenthNote />
                            <Separator
                              orientation="vertical"
                              className="h-4 w-[1px] bg-foreground/25"
                            />
                            <div className="baseFlex relative !items-end">
                              <div className="h-4 w-[1px] bg-foreground"></div>
                              <div className="absolute bottom-[5px] left-0 h-[3px] w-2 bg-foreground"></div>
                              <div className="absolute bottom-0 left-0 h-[3px] w-2 bg-foreground"></div>
                            </div>
                            <Separator
                              orientation="vertical"
                              className="h-4 w-[1px] bg-foreground/25"
                            />
                            <SixteenthRest />
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="baseVertFlex !items-start gap-2">
                  <div className="baseVertFlex gap-1">
                    <p className="text-sm font-medium">Dotted notes</p>
                    <Separator className="mb-2 w-full bg-primary" />
                  </div>

                  <div>
                    <p className="mb-2 text-sm">
                      A dotted note increases the length of the original note by
                      half, while a double-dotted note increases the length of
                      the original note by three quarters.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export default GlossaryDialog;
