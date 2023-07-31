import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "~/utils/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  const [isDragging, setIsDragging] = React.useState(false);

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow cursor-pointer overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range
          style={{
            transitionDuration: isDragging ? "0s" : "1s",
          }}
          className="active absolute h-full bg-primary transition-[width] ease-linear"
        />
      </SliderPrimitive.Track>
      {/* <div
        style={{
          transitionDuration: isDragging ? "0s" : "1s",
        }}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
      > */}
      <SliderPrimitive.Thumb
        style={{
          transitionDuration: isDragging ? "0s" : "1s",
        }}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        // also figure out where the focus-ring is going/why we can't see it
        className="block h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-background ring-offset-background transition-all ease-linear focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
      />
      {/* </div> */}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
