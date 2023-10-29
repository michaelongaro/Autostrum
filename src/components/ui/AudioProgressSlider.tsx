import * as React from "react";
import { useState, useEffect } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";

import { cn } from "~/utils/utils";

const AudioProgressSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  const [isDragging, setIsDragging] = useState(false);

  // needed since radix-ui doesn't expose the wrapper that acutally moves the
  // thumb, so we need to get it ourselves to set the transition property
  const [thumbElemNode, setThumbElemNode] = useState<HTMLSpanElement | null>(
    null
  );

  // wasn't working by setting inline styles on <Track />, so doing same treatment
  // as with thumb here
  const [trackElemNode, setTrackElemNode] = useState<HTMLSpanElement | null>(
    null
  );

  useEffect(() => {
    setTimeout(() => {
      const audioSliderNode = document.getElementById("audioSlider");
      if (audioSliderNode) {
        setThumbElemNode(
          Array.from(audioSliderNode.children).at(-1) as HTMLSpanElement
        );
        setTrackElemNode(
          Array.from(audioSliderNode.children[0].children)[0] as HTMLSpanElement
        );
      }
    }, 1000);
  }, []);

  const { audioMetadata } = useTabStore(
    (state) => ({
      audioMetadata: state.audioMetadata,
    }),
    shallow
  );

  useEffect(() => {
    if (!thumbElemNode || !trackElemNode) return;

    if (!audioMetadata.playing || isDragging) {
      thumbElemNode.style.transition = "none";
      trackElemNode.style.transition = "none";
      return;
    }

    thumbElemNode.style.transition = "left 1s linear";
    trackElemNode.style.transition = "right 1s linear";
  }, [thumbElemNode, trackElemNode, isDragging, audioMetadata.playing]);

  return (
    <SliderPrimitive.Root
      ref={ref}
      id="audioSlider"
      className={cn(
        "relative flex w-full touch-none select-none items-center disabled:cursor-not-allowed data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        className="relative h-2 w-full grow cursor-pointer overflow-hidden rounded-full bg-secondary"
      >
        <SliderPrimitive.Range className="active absolute h-full bg-primary" />
      </SliderPrimitive.Track>

      <SliderPrimitive.Thumb
        onFocus={() => setIsDragging(true)}
        onBlur={() => setIsDragging(false)}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        // also figure out where the focus-ring is going/why we can't see it
        className="block h-5 w-5 cursor-grab rounded-full
border-2 border-primary bg-background ring-offset-background hover:scale-105 
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 active:cursor-grabbing active:shadow-md disabled:pointer-events-none disabled:opacity-50"
      />
    </SliderPrimitive.Root>
  );
});

AudioProgressSlider.displayName = SliderPrimitive.Root.displayName;

export { AudioProgressSlider };
