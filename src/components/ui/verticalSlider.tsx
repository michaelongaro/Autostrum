import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "~/utils/utils";

const VerticalSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-28 w-2 touch-none select-none items-center",
      className
    )}
    orientation="vertical"
    {...props}
  >
    <SliderPrimitive.Track className="relative h-full w-full grow cursor-pointer overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full w-full bg-primary" />
    </SliderPrimitive.Track>
    {/* not sure why these arbitary left/top values were necessary to get thumb position where it should
        be, but it works for now */}
    <SliderPrimitive.Thumb
      className="absolute left-[-6px] top-[-10px] block h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-background ring-offset-background transition-colors hover:scale-105 
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 active:cursor-grabbing active:shadow-md disabled:pointer-events-none disabled:opacity-50"
    />
  </SliderPrimitive.Root>
));
VerticalSlider.displayName = SliderPrimitive.Root.displayName;

export { VerticalSlider };
