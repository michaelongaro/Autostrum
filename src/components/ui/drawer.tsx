"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import type { StyledProps } from "./base-ui-types";
import { cn } from "~/utils/cn";
import {
  MobileModalContext,
  useMobileModal,
  useMobileModalRef,
} from "./mobile-modal";

const SwipeContext = React.createContext({
  disabled: false,
  handleOnly: false,
});

type DrawerProps = DrawerPrimitive.Root.Props & {
  swipeDisabled?: boolean;
  swipeHandleOnly?: boolean;
};

function Drawer({
  swipeDisabled = false,
  swipeHandleOnly = false,
  onOpenChange,
  modal = true,
  ...props
}: DrawerProps) {
  const mobileModal = useMobileModal(modal);
  return (
    <MobileModalContext.Provider value={mobileModal}>
      <SwipeContext.Provider
        value={{ disabled: swipeDisabled, handleOnly: swipeHandleOnly }}
      >
        <DrawerPrimitive.Root
          {...props}
          modal={mobileModal ? "trap-focus" : modal}
          onOpenChange={(open, details) => {
            if (swipeDisabled && details.reason === "swipe") {
              details.cancel();
              return;
            }
            onOpenChange?.(open, details);
          }}
        />
      </SwipeContext.Provider>
    </MobileModalContext.Provider>
  );
}

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

// Match Vaul's quick start and long, gentle settle on both enter and exit.
const drawerMotion: React.CSSProperties = {
  transitionDuration: "500ms",
  transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
};

const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Backdrop>,
  StyledProps<typeof DrawerPrimitive.Backdrop>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Backdrop
    ref={ref}
    style={drawerMotion}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 opacity-[calc(1_-_var(--drawer-swipe-progress,0))] transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 data-[swiping]:transition-none motion-reduce:transition-none",
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = "DrawerOverlay";

type DrawerContentProps = StyledProps<typeof DrawerPrimitive.Popup> & {
  forPlaybackModalTuner?: boolean;
};
const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Popup>,
  DrawerContentProps
>(({ className, children, forPlaybackModalTuner, ...props }, ref) => {
  const swipe = React.useContext(SwipeContext);
  const popupRef = useMobileModalRef(ref);
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center p-2 outline-none">
        <DrawerPrimitive.Popup
          ref={popupRef}
          data-slot="drawer-content"
          data-base-ui-swipe-ignore={swipe.disabled ? "" : undefined}
          style={drawerMotion}
          className={cn(
            "relative flex h-auto w-full max-w-md translate-y-[var(--drawer-swipe-movement-y)] flex-col overflow-hidden !rounded-[20px] bg-background pt-3 outline-none transition-transform data-[ending-style]:translate-y-[calc(100%_+_16px)] data-[starting-style]:translate-y-[calc(100%_+_16px)] data-[swiping]:select-none data-[swiping]:transition-none motion-reduce:transition-none",
            className,
          )}
          {...props}
        >
          <div
            data-slot="drawer-swipe-handle"
            aria-hidden="true"
            className={cn(
              "mx-auto h-1 w-12 shrink-0 rounded-full bg-gray/25",
              forPlaybackModalTuner ? "mb-8 mt-4" : "mb-2",
            )}
          />
          <DrawerPrimitive.Content
            className="contents"
            data-base-ui-swipe-ignore={swipe.handleOnly ? "" : undefined}
          >
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  );
});
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Title>,
  StyledProps<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Description>,
  StyledProps<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-foreground/75", className)}
    {...props}
  />
));
DrawerDescription.displayName = "DrawerDescription";

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
