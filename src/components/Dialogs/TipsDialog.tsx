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

      <DialogContent className="baseVertFlex max-h-[90dvh] max-w-[350px] !justify-start gap-4 overflow-y-auto rounded-lg bg-pink-100 text-pink-950 sm:max-w-[500px]">
        <div className="baseFlex w-full !justify-start gap-2 text-lg font-semibold">
          <HiOutlineInformationCircle className="size-5" />
          Tips
        </div>

        <div className="baseVertFlex w-full !items-start gap-2">
          {/* Tab */}
          <div className="font-medium underline">Tab</div>
          <div className="baseFlex !items-start gap-2">
            <div className="mt-3 h-[1px] w-3 shrink-0 bg-pink-950" />
            Use a BPM marker when an entire section of the song needs a new,
            consistent tempo. For small, one-off timing changes like a brief
            pause or a few faster notes, it&apos;s recommended to adjust the
            length of the individual notes instead.
          </div>

          {/* Strumming */}
          <div className="mt-2 font-medium underline">Strumming</div>
          <div className="baseFlex !items-start gap-2">
            <div className="mt-3 h-[1px] w-3 shrink-0 bg-pink-950" />
            <div className="baseVertFlex w-full !items-start gap-2">
              You only need to assign chords to the first strum where the chord
              changes. <br></br>
              <span className="text-sm opacity-75">
                Ex: 3 downstrums of &lsquo;C&rsquo; followed by an upstrum of
                &lsquo;Am&rsquo; would only need to assign chords to the first
                and fourth strums.
              </span>
            </div>
          </div>

          {/* Hotkeys */}
          <div className="mt-2 font-medium underline">Hotkeys</div>
          <div className="baseFlex !items-start gap-2">
            <div className="mt-3 h-[1px] w-3 shrink-0 bg-pink-950" />
            You can navigate through inputs with your arrow keys.
          </div>
          <div className="baseFlex !items-start gap-2">
            <div className="mt-3 h-[1px] w-3 shrink-0 bg-pink-950" />
            <span>
              Enter
              <kbd className="ml-1.5">A</kbd> - <kbd className="mr-1.5">G</kbd>
              for the respective major chord.
            </span>
          </div>
          <div className="baseFlex !items-start gap-2">
            <div className="mt-3 h-[1px] w-3 shrink-0 bg-pink-950" />
            <span>
              Enter
              <kbd className="ml-1.5">a</kbd> - <kbd className="mr-1.5">g</kbd>
              for the respective minor chord.
            </span>
          </div>
          <div className="baseFlex !items-start gap-2">
            <div className="mt-3 h-[1px] w-3 shrink-0 bg-pink-950" />
            <span>
              Copying ( <kbd>Ctrl</kbd> + <kbd>C</kbd> ) & pasting ({" "}
              <kbd>Ctrl</kbd> + <kbd>V</kbd> ) chords works as expected.
            </span>
          </div>
          <div className="baseFlex !items-start gap-2">
            <div className="mt-3 h-[1px] w-3 shrink-0 bg-pink-950" />
            <span>
              Enter
              <kbd className="ml-1.5">q</kbd> / <kbd className="mr-1.5">w</kbd>
              to add a new chord before / after the current chord.
            </span>
          </div>
          <div className="baseFlex !items-start gap-2">
            <div className="mt-3 h-[1px] w-3 shrink-0 bg-pink-950" />
            <span>
              Enter
              <kbd className="ml-1.5">y</kbd> / <kbd>h</kbd> /{" "}
              <kbd className="mr-1.5">n</kbd>
              to change the current chord&apos;s note length between 1/4th,
              1/8th, and 1/16th respectively.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TipsDialog;
