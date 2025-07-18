import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { PopoverArrow } from "@radix-ui/react-popover";

import { cn } from "~/utils/cn";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  showArrow?: boolean;
}

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(
  (
    { className, align = "center", sideOffset = 4, showArrow = true, ...props },
    ref,
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={16}
        className={cn(
          "pointer-events-auto z-50 w-72 rounded-md border bg-background p-4 text-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      >
        {showArrow && <PopoverArrow className="fill-border" />}
        {props.children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  ),
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
