import * as React from "react";
import { useState, useEffect } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { useTabStore } from "~/stores/TabStore";

import { cn } from "~/utils/utils";

const AudioProgressSlider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const thumbRef = React.useRef<HTMLSpanElement>(null);
  const rangeRef = React.useRef<HTMLSpanElement>(null);

  // needed since radix-ui doesn't expose the wrapper that acutally moves the
  // thumb, so we need to get it ourselves to set the transition property
  const [thumbElemNode, setThumbElemNode] = useState<HTMLSpanElement | null>(
    null,
  );

  // wasn't working by setting inline styles on <Track />, so doing same treatment
  // as with thumb here
  const [trackElemNode, setTrackElemNode] = useState<HTMLSpanElement | null>(
    null,
  );

  useEffect(() => {
    setTimeout(() => {
      const audioSliderNode = document.getElementById("audioSlider");
      if (audioSliderNode) {
        setThumbElemNode(
          Array.from(audioSliderNode.children).at(-1) as HTMLSpanElement,
        );
        setTrackElemNode(
          Array.from(
            audioSliderNode.children[0]!.children,
          )[0] as HTMLSpanElement,
        );
      }
    }, 1000);
  }, []);

  // This effect attempts to fix safari's glitchy animation behavior with the thumb positioning
  // while the audio is playing. Safari was calculating out the percentage to a much higher degree of
  // acuraccy than chrome, and it's my only guess as to why the thumb was jumping around so much. Most
  // likely an implementation bug in radix-ui as far as I can tell though.
  useEffect(() => {
    if (!thumbRef.current || !rangeRef.current) return;

    const config: MutationObserverInit = {
      attributes: true,
      childList: false,
      subtree: false,
    };

    const trackCallback: MutationCallback = (mutationsList) => {
      for (const mutation of mutationsList) {
        const range = rangeRef.current;
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style" &&
          range
        ) {
          // Extract the numeric value from the style property
          const rightValue = parseFloat(range.style.right);

          if (!isNaN(rightValue)) {
            // Round the value to 2 decimal places and set it back to the style
            range.style.right = `${rightValue.toFixed(2)}%`;
          }
        }
      }
    };

    const rangeObserver = new MutationObserver(trackCallback);
    rangeObserver.observe(rangeRef.current, config);

    const thumbCallback: MutationCallback = (mutationsList) => {
      for (const mutation of mutationsList) {
        const thumb = thumbRef.current;
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style" &&
          thumb
        ) {
          // Extract the numeric value from the style property
          const leftValue = parseFloat(thumb.style.left);

          // Check if the value is a number
          if (!isNaN(leftValue)) {
            // Round the value to 2 decimal places and set it back to the style
            thumb.style.left = `${leftValue.toFixed(2)}%`;
          }
        }
      }
    };

    const thumbObserver = new MutationObserver(thumbCallback);
    thumbObserver.observe(thumbRef.current, config);

    return () => {
      rangeObserver.disconnect();
      thumbObserver.disconnect();
    };
  }, []);

  const { audioMetadata } = useTabStore((state) => ({
    audioMetadata: state.audioMetadata,
  }));

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
        "relative flex w-full touch-none select-none items-center shadow-sm disabled:cursor-not-allowed data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        // would love to make this height larger, but radix-ui slider thumb positioning calculations
        // are a bit off, so making the height larger makes the inconsistency more noticeable
        // ^ https://github.com/radix-ui/primitives/issues/1966
        className="relative h-[8px] w-full grow cursor-pointer overflow-hidden rounded-full bg-secondary"
      >
        <SliderPrimitive.Range
          ref={rangeRef}
          className="active absolute h-full bg-primary"
        />
      </SliderPrimitive.Track>

      <SliderPrimitive.Thumb
        ref={thumbRef}
        onFocus={() => setIsDragging(true)}
        onBlur={() => setIsDragging(false)}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        className="block h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-background shadow-md ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 active:cursor-grabbing active:shadow-lg disabled:pointer-events-none disabled:opacity-50"
      />
    </SliderPrimitive.Root>
  );
});

AudioProgressSlider.displayName = SliderPrimitive.Root.displayName;

export { AudioProgressSlider };
