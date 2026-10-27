import { useEffect, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "~/components/ui/carousel";

function resizeWithoutScrolling(
  api: NonNullable<CarouselApi>,
  entries: ResizeObserverEntry[],
) {
  const engine = api.internalEngine();
  const slides = api.slideNodes();
  const container = api.containerNode();

  if (
    entries.some(
      ({ target }) =>
        target === container &&
        Math.abs(container.offsetWidth - engine.containerRect.width) >= 0.5,
    )
  ) {
    return true;
  }

  const sizeChanged = entries.some(({ target }) => {
    const slideIndex = slides.indexOf(target as HTMLElement);
    const previousSize = engine.slideRects[slideIndex]?.width;

    return (
      previousSize !== undefined &&
      Math.abs((target as HTMLElement).offsetWidth - previousSize) >= 0.5
    );
  });

  if (sizeChanged) {
    // Embla normally snaps to a slide on resize. Keep the user's offset while
    // the checkmarks resize their pills, clamping only at the content edges.
    const position = engine.offsetLocation.get();
    api.reInit();
    const updatedEngine = api.internalEngine();
    updatedEngine.scrollBody.useDuration(0);
    updatedEngine.scrollTo.distance(
      updatedEngine.limit.constrain(position) - updatedEngine.target.get(),
      false,
    );
    api.emit("scroll");
  }

  return false;
}

const carouselOptions = {
  // Match the legend's px-4 inset without scrolling past the content edges.
  align: () => 16,
  containScroll: "keepSnaps",
  dragFree: true,
  watchResize: resizeWithoutScrolling,
} as const;

interface SearchFilterCarouselProps<T> {
  label: string;
  value: T;
  options: {
    value: T;
    label: ReactNode;
    disabled?: boolean;
    badgeColor?: string;
  }[];
  onValueChange: (value: T) => void;
}

function SearchFilterCarousel<T>({
  label,
  value,
  options,
  onValueChange,
}: SearchFilterCarouselProps<T>) {
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;

    const slides = api.slideNodes();
    const viewport = api.rootNode().getBoundingClientRect();
    const allOptionsVisible = slides.every((slide) => {
      const { left, right } = slide.getBoundingClientRect();
      return left >= viewport.left - 1 && right <= viewport.right + 1;
    });

    if (allOptionsVisible) return;

    // Each row mounts when the drawer opens. Reveal its current selection once,
    // without snapping again as the user selects pills or drags the carousel.
    const selectedSlide = slides.findIndex((slide) =>
      slide.querySelector('[aria-pressed="true"]'),
    );

    if (selectedSlide !== -1) api.scrollTo(selectedSlide, true);
  }, [api]);

  return (
    <fieldset className="min-w-0 border-0 pb-4">
      <legend className="px-4 text-sm font-medium">{label}</legend>
      <Carousel
        aria-label={`${label} options`}
        opts={carouselOptions}
        setApi={setApi}
        className="w-full"
        data-vaul-no-drag
      >
        <CarouselContent className="ml-0 gap-2 px-4 py-1">
          {options.map((option, index) => {
            const selected = option.value === value;
            const content = (
              <>
                <span className="inline-flex items-center gap-2">
                  {option.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`ease-out inline-flex h-3.5 shrink-0 items-center justify-center overflow-hidden transition-[width,margin-left,opacity,transform] duration-200 motion-reduce:transition-none ${
                    selected
                      ? "ml-2 w-3.5 scale-100 opacity-100"
                      : "ml-0 w-0 scale-75 opacity-0"
                  } ${option.badgeColor ? "text-white" : ""}`}
                >
                  <Check className="size-3.5 shrink-0" />
                </span>
              </>
            );

            return (
              <CarouselItem key={index} className="basis-auto pl-0 last:mr-4">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  aria-pressed={selected}
                  disabled={option.disabled}
                  onClick={() => onValueChange(option.value)}
                  className={`gap-0 whitespace-nowrap rounded-full active:scale-95 motion-reduce:transform-none ${
                    option.badgeColor
                      ? "outline-transparent bg-transparent p-0 shadow-none hover:bg-transparent active:brightness-75"
                      : `px-3 active:bg-primary/20 ${selected ? "outline-primary bg-primary/10" : "outline-gray/50"}`
                  }`}
                >
                  {option.badgeColor ? (
                    <Badge
                      style={{
                        backgroundColor: option.badgeColor.replace(
                          /\)$/,
                          " / 0.7)",
                        ),
                      }}
                      className="h-full min-w-0 gap-0 border-0 px-3 text-sm font-medium text-primary-foreground"
                    >
                      {content}
                    </Badge>
                  ) : (
                    content
                  )}
                </Button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </fieldset>
  );
}

export default SearchFilterCarousel;
