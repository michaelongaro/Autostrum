import type { StyledProps } from "./base-ui-types";
import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "~/utils/cn";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const POPOVER_ARROW_HEIGHT = 5;

interface PopoverContentProps
  extends
    StyledProps<typeof PopoverPrimitive.Popup>,
    Pick<
      PopoverPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding"
    > {
  showArrow?: boolean;
}

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Popup>,
  PopoverContentProps
>(
  (
    {
      className,
      align = "center",
      alignOffset = 0,
      side = "bottom",
      sideOffset = 4,
      collisionPadding = 16,
      showArrow = true,
      ...props
    },
    ref,
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        // Radix included the arrow height in addition to sideOffset. Base UI
        // measures to the popup edge, so include it explicitly to keep the gap.
        sideOffset={
          typeof sideOffset === "function"
            ? (data) =>
                sideOffset(data) + (showArrow ? POPOVER_ARROW_HEIGHT : 0)
            : sideOffset + (showArrow ? POPOVER_ARROW_HEIGHT : 0)
        }
        collisionPadding={collisionPadding}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          ref={ref}
          className={cn(
            "pointer-events-auto z-50 w-72 rounded-md border bg-background p-4 text-foreground shadow-md outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
            className,
          )}
          {...props}
        >
          {showArrow && (
            // Keep the measured box unrotated and sized for the resolved side.
            // Rotating a 10x5 box moves its base away from the popup edge.
            <PopoverPrimitive.Arrow className="group h-[5px] w-2.5 fill-border data-[side=bottom]:-top-[5px] data-[side=left]:-right-[5px] data-[side=right]:-left-[5px] data-[side=top]:-bottom-[5px] data-[side=left]:h-2.5 data-[side=right]:h-2.5 data-[side=left]:w-[5px] data-[side=right]:w-[5px]">
              <svg
                width="10"
                height={POPOVER_ARROW_HEIGHT}
                viewBox="0 0 10 5"
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-data-[side=bottom]:rotate-180 group-data-[side=left]:-rotate-90 group-data-[side=right]:rotate-90"
              >
                <path d="M0 0H10L5 5Z" />
              </svg>
            </PopoverPrimitive.Arrow>
          )}
          <PopoverPrimitive.Close className="sr-only" tabIndex={-1}>
            Close
          </PopoverPrimitive.Close>
          {props.children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  ),
);
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent };
