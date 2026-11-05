import type { StyledProps } from "./base-ui-types";
import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "~/utils/cn";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = ({ ...props }: DialogPrimitive.Portal.Props) => (
  <DialogPrimitive.Portal {...props} />
);
DialogPortal.displayName = "DialogPortal";

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Backdrop>,
  StyledProps<typeof DialogPrimitive.Backdrop>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Backdrop
    ref={ref}
    style={{
      // had it as "!duration-300", and the !important overrode updateCSSThemeVars()
      transitionDuration: "300ms",
      animationDuration: "300ms",
    }}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

type DialogContentProps = StyledProps<typeof DialogPrimitive.Popup> & {
  closeButtonColor?: string;
  renderCloseButton?: boolean;
};

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Popup>,
  DialogContentProps
>(
  (
    {
      className,
      children,
      closeButtonColor,
      renderCloseButton = true,
      ...props
    },
    ref,
  ) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={ref}
        style={{
          // had it as "!duration-300", and the !important overrode updateCSSThemeVars()
          transitionDuration: "300ms",
          animationDuration: "300ms",
        }}
        className={cn(
          "modalGradient fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 text-foreground shadow-lg transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 sm:rounded-lg md:w-full",
          className,
        )}
        {...props}
      >
        {children}

        {renderCloseButton && (
          <DialogPrimitive.Close
            style={{
              color: closeButtonColor,
            }}
            className="baseFlex absolute right-4 top-4 size-5 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-foreground/70 disabled:pointer-events-none"
          >
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  ),
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  StyledProps<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  StyledProps<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-foreground/75", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
