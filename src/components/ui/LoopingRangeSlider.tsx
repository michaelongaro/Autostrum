import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "~/utils/utils";

const LoopingRangeSlider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <SliderPrimitive.Root
      ref={ref}
      minStepsBetweenThumbs={2}
      className={cn(
        "relative flex w-full touch-none select-none items-center shadow-sm disabled:cursor-not-allowed data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        // would love to make this height larger, but radix-ui slider thumb positioning calculations
        // are a bit off, so making the height larger makes the inconsistency more noticeable
        // ^ https://github.com/radix-ui/primitives/issues/1966
        className="relative h-[8px] w-full grow cursor-pointer overflow-hidden rounded-full bg-secondary"
      >
        <SliderPrimitive.Range className="active absolute h-full bg-primary" />
      </SliderPrimitive.Track>

      <SliderPrimitive.Thumb className="block h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-background shadow-md ring-offset-background hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 active:cursor-grabbing active:shadow-lg disabled:pointer-events-none disabled:opacity-50" />
      <SliderPrimitive.Thumb className="block h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-background shadow-md ring-offset-background hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 active:cursor-grabbing active:shadow-lg disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
});

LoopingRangeSlider.displayName = SliderPrimitive.Root.displayName;

export { LoopingRangeSlider };
