import { useEffect, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "~/components/ui/carousel";

interface SearchFilterCarouselProps<T> {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  onValueChange: (value: T) => void;
}

function SearchFilterCarousel<T>({
  label,
  value,
  options,
  onValueChange,
}: SearchFilterCarouselProps<T>) {
  const [api, setApi] = useState<CarouselApi>();
  const selectedIndex = options.findIndex((option) => option.value === value);

  useEffect(() => {
    api?.scrollTo(Math.max(0, selectedIndex), true);
  }, [api, selectedIndex]);

  return (
    <fieldset className="min-w-0 border-0 pb-3">
      <legend className="px-4 text-sm font-medium">{label}</legend>
      <Carousel
        aria-label={`${label} options`}
        opts={{ align: "start", dragFree: true }}
        setApi={setApi}
        className="w-full"
        data-vaul-no-drag
      >
        <CarouselContent className="ml-0 gap-2 px-4 py-1">
          {options.map((option, index) => (
            <CarouselItem key={index} className="basis-auto pl-0">
              <Button
                type="button"
                variant="outline"
                size="default"
                aria-pressed={option.value === value}
                disabled={option.disabled}
                onClick={() => onValueChange(option.value)}
                className={`gap-2 whitespace-nowrap px-3 ${
                  option.value === value
                    ? "border-primary bg-primary/10"
                    : "border-gray/50"
                }`}
              >
                {option.label}
                {option.value === value && (
                  <Check aria-hidden="true" className="size-3.5 shrink-0" />
                )}
              </Button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </fieldset>
  );
}

export default SearchFilterCarousel;
