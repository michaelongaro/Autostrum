import { useRef } from "react";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/components/ui/drawer";
import { useIPhoneAudioReminderStore } from "~/stores/IPhoneAudioReminderStore";
import IPhoneSilentModeAnimation from "./IPhoneSilentModeAnimation";

export default function IPhoneSoundDrawer() {
  const playbackTriggerRef = useRef<HTMLElement | null>(null);
  const open = useIPhoneAudioReminderStore((state) => state.open);
  const dismissReminder = useIPhoneAudioReminderStore(
    (state) => state.dismissReminder,
  );

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) dismissReminder();
      }}
      shouldScaleBackground={false}
      autoFocus
    >
      <DrawerContent
        className="max-h-[calc(100dvh-24px)] px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] motion-reduce:!animate-none motion-reduce:!transition-none"
        onOpenAutoFocus={() => {
          playbackTriggerRef.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          if (playbackTriggerRef.current?.isConnected) {
            event.preventDefault();
            playbackTriggerRef.current.focus({ preventScroll: true });
          }
        }}
      >
        {/* Keep scrolling inside Vaul's shell so its drag extension stays clipped. */}
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <div className="mb-4 mt-3 text-center">
            <DrawerTitle className="baseFlex gap-2 text-[22px] leading-tight">
              <IPhoneSilentModeAnimation />
              Turn off Silent Mode
            </DrawerTitle>
            <DrawerDescription className="mx-auto mt-3 max-w-[320px] text-sm leading-relaxed">
              Silent Mode can mute Autostrum&apos;s audio even when your volume
              is turned up.
            </DrawerDescription>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-foreground/10 bg-secondary/35 p-4 text-left">
            <div>
              <p className="text-xs font-semibold">iPhone 16 and newer</p>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/75">
                Swipe down from the top-right corner to open Control Center. Tap
                the crossed-out bell to turn Silent Mode off.
              </p>
            </div>
            <div className="border-t border-foreground/10 pt-4">
              <p className="text-xs font-semibold">iPhone 15 and older</p>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/75">
                Flip the Ring/Silent switch on the left side toward the screen
                so the orange mark is hidden.
              </p>
            </div>
          </div>

          <p className="mx-auto mt-4 max-w-[320px] text-center text-xs leading-relaxed text-foreground/75">
            Then check your volume and tap play again.
          </p>

          <div className="mt-5 flex flex-col gap-1">
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => dismissReminder()}
            >
              Got it
            </Button>
            <Button
              type="button"
              variant="link"
              className="min-h-11 underline underline-offset-4"
              onClick={() => dismissReminder(true)}
            >
              Do not show this again
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
