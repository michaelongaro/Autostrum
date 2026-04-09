import type { Dispatch, SetStateAction } from "react";
import { HiOutlineInformationCircle } from "react-icons/hi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface TipsDialog {
  showTipsDialog: boolean;
  setShowTipsDialog: Dispatch<SetStateAction<boolean>>;
}

function TipsDialog({ showTipsDialog, setShowTipsDialog }: TipsDialog) {
  return (
    <Dialog
      onOpenChange={(open) => {
        setShowTipsDialog(open);
      }}
      open={showTipsDialog}
    >
      <VisuallyHidden>
        <DialogTitle>Effect glossary </DialogTitle>
        <DialogDescription>
          A list of all the effects and their notations that can be used in the
          tab editor.
        </DialogDescription>
      </VisuallyHidden>

      <DialogContent className="baseVertFlex max-h-[90dvh] max-w-[350px] !justify-start gap-4 overflow-y-auto rounded-lg sm:max-w-[550px] xl:max-w-[1000px]">
        <div className="baseFlex w-full !justify-start gap-2 text-lg font-semibold">
          <HiOutlineInformationCircle className="size-5" />
          Tips
        </div>

        <div className="baseVertFlex w-full !items-start gap-8 xl:!flex-row">
          <div className="baseVertFlex w-full !items-start gap-8">
            {/* Tab */}
            <div className="baseVertFlex !items-start">
              <div className="font-medium">Tab</div>
              <div className="baseFlex !items-start gap-2">
                <div className="mt-3 h-[1px] w-2 shrink-0 bg-foreground" />
                Use a BPM marker when an entire section of the song needs a new,
                consistent tempo. For small, one-off timing changes like a brief
                pause or a few faster notes, it&apos;s recommended to adjust the
                length of the individual notes instead.
              </div>
            </div>

            {/* Chords */}
            <div className="baseVertFlex !items-start">
              <div className="font-medium">Chords</div>
              <div className="baseFlex !items-start gap-2">
                <div className="mt-3 h-[1px] w-2 shrink-0 bg-foreground" />
                Major and minor chords are automatically assigned specific
                colors. It is recommended to stick to these colors when possible
                to maintain consistent coloring across tabs.
              </div>
            </div>

            {/* Strumming */}
            <div className="baseVertFlex !items-start">
              <div className="font-medium">Strumming</div>
              <div className="baseFlex !items-start gap-2">
                <div className="mt-3 h-[1px] w-2 shrink-0 bg-foreground" />
                <div className="baseVertFlex w-full !items-start gap-2">
                  You only need to assign chords to the first strum where the
                  chord changes. <br></br>
                  <span className="text-sm opacity-75">
                    Ex: 3 downstrums of &lsquo;C&rsquo; followed by an upstrum
                    of &lsquo;Am&rsquo; would only need the first and fourth
                    strums to be assigned chords.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hotkeys */}
          <div className="baseVertFlex w-full !items-start">
            <div className="font-medium">Hotkeys</div>
            <div className="baseVertFlex !items-start gap-4">
              <div className="baseFlex !items-start gap-2">
                <div className="mt-3 h-[1px] w-2 shrink-0 bg-foreground" />
                You can navigate through inputs with your arrow keys.
              </div>
              <div className="baseFlex !items-start gap-2">
                <div className="mt-3 h-[1px] w-2 shrink-0 bg-foreground" />
                <span>
                  Copying ( <kbd>Ctrl</kbd> <kbd>C</kbd> ) & pasting ({" "}
                  <kbd>Ctrl</kbd> <kbd>V</kbd> ) chords works as expected.
                </span>
              </div>
              <div className="baseFlex !items-start gap-2">
                <div className="mt-3 h-[1px] w-2 shrink-0 bg-foreground" />
                <span>
                  Enter
                  <kbd className="ml-1.5">A</kbd> -{" "}
                  <kbd className="mr-1">G</kbd> or
                  <kbd className="ml-1.5">a</kbd> -{" "}
                  <kbd className="mr-1">g</kbd> for the respective major / minor
                  chord.
                </span>
              </div>

              <div className="baseFlex !items-start gap-2">
                <div className="mt-3 h-[1px] w-2 shrink-0 bg-foreground" />
                <span>
                  Enter
                  <kbd className="ml-1.5">q</kbd> /{" "}
                  <kbd className="mr-1.5">w</kbd>
                  to add a new chord before / after the current chord.
                </span>
              </div>
              <div className="baseFlex !items-start gap-2">
                <div className="mt-3 h-[1px] w-2 shrink-0 bg-foreground" />
                <span>
                  Enter
                  <kbd className="ml-1.5">Shift</kbd> <kbd>↑</kbd> /{" "}
                  <kbd>Shift</kbd> <kbd className="mr-1.5">↓</kbd>
                  to change the current chord&apos;s note length. Add{" "}
                  <kbd className="mx-0.5">Ctrl</kbd> for dotted and
                  double-dotted lengths.
                </span>
              </div>
              <div className="baseFlex !items-start gap-2">
                <div className="mt-3 h-[1px] w-2 shrink-0 bg-foreground" />
                <span>
                  Enter
                  <kbd className="ml-1.5">Ctrl</kbd> <kbd>Backspace</kbd> or
                  <kbd className="ml-1.5">Ctrl</kbd> <kbd>Shift</kbd>{" "}
                  <kbd>Backspace</kbd> to clear / delete current chord.
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TipsDialog;
