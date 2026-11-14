import { AnimatedToggleGroup } from "~/components/ui/AnimatedToggleGroup";
import useEmblaCarousel from "embla-carousel-react";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  Keyboard,
  Move,
  Palette,
  Play,
  Repeat2,
  SlidersHorizontal,
  ZoomIn,
} from "lucide-react";
import { BsSpeedometer2 } from "react-icons/bs";
import { MdModeEditOutline } from "react-icons/md";
import { PiMouseScroll } from "react-icons/pi";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ComponentProps,
} from "react";
import dynamic from "next/dynamic";
import { cn } from "~/utils/cn";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import type { FeatureId } from "./FeaturePreviews";
import styles from "./FeatureShowcase.module.css";

import type { IconType } from "react-icons";

const FeaturePreview = dynamic(() => import("./FeaturePreviews"), {
  ssr: false,
});

// Keep the headings and controls server rendered. The offscreen editor demos
// need neither their large bundle nor their notation DOM on the initial load.
function DeferredFeaturePreview(props: ComponentProps<typeof FeaturePreview>) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-full">
      {ready ? (
        <FeaturePreview {...props} />
      ) : (
        <div className="h-[312px]" aria-hidden="true" />
      )}
    </div>
  );
}

type Feature = {
  id: FeatureId;
  title: string;
  icon: IconType;
};
type FeatureMode = "Practice" | "Compose";

const PRACTICE_FEATURES: Feature[] = [
  {
    id: "zoom",
    title: "Adjustable zoom",
    icon: ZoomIn,
  },
  {
    id: "colors",
    title: "Color-coded chords",
    icon: Palette,
  },
  {
    id: "speed",
    title: "Granular playback speed",
    icon: BsSpeedometer2,
  },
  {
    id: "loop",
    title: "Loop the part you need",
    icon: Repeat2,
  },
];
const EDITING_FEATURES: Feature[] = [
  {
    id: "hotkeys",
    title: "Useful hotkeys",
    icon: Keyboard,
  },
  {
    id: "autoscroll",
    title: "Autoscroll playback",
    icon: PiMouseScroll,
  },
  {
    id: "tuning",
    title: "Advanced tuning editor",
    icon: SlidersHorizontal,
  },
  {
    id: "reordering",
    title: "Easy reordering",
    icon: Move,
  },
];

function FeaturePanel({
  feature,
  reduceMotion,
  active,
}: {
  feature: Feature;
  reduceMotion: boolean;
  active: boolean;
}) {
  const isPresent = useIsPresent();
  return (
    <motion.div
      key={feature.id}
      role="tabpanel"
      id={`feature-panel-${feature.id}`}
      aria-labelledby={`feature-tab-${feature.id}`}
      aria-hidden={!isPresent}
      inert={!isPresent}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.15, ease: "easeInOut" }}
      className={cn(
        "relative flex items-center justify-center p-4",
        PRACTICE_FEATURES.some(({ id }) => id === feature.id)
          ? styles.practicePanel
          : styles.composePanel,
      )}
    >
      <div
        className={cn(
          "w-full min-w-0",
          feature.id === "hotkeys" || feature.id === "autoscroll"
            ? "max-w-[580px]"
            : "max-w-[540px]",
        )}
      >
        <DeferredFeaturePreview
          feature={feature.id}
          active={active && isPresent}
        />
      </div>
    </motion.div>
  );
}

function AnimatedPreview({
  feature,
  reduceMotion,
  active,
}: {
  feature: Feature;
  reduceMotion: boolean;
  active: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    // Measure the natural content height independently of the animated frame.
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.height > 0) {
        setHeight(entry.contentRect.height);
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height: height ?? "auto" }}
      transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeInOut" }}
      className={cn(
        styles.previewSurface,
        "relative box-content min-h-[440px] min-w-0 self-start overflow-hidden rounded-xl border border-foreground/20",
      )}
    >
      <div ref={contentRef} className="relative min-w-0">
        <AnimatePresence initial={false} mode="wait">
          <FeaturePanel
            key={feature.id}
            feature={feature}
            reduceMotion={reduceMotion}
            active={active}
          />
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function PracticeCarousel({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  const [carouselRef, api] = useEmblaCarousel({
    align: "center",
    loop: true,
    slidesToScroll: 1,
    dragFree: false,
    skipSnaps: false,
    // Button presses clear Embla's click suppression after a carousel swipe.
    // Sliders and the playback strip keep ownership of their own drag gestures.
    watchDrag: (_api, event) =>
      !(
        event.target instanceof Element &&
        !event.target.closest("button") &&
        event.target.closest(
          "[role='slider'], [data-feature-control], [data-playback-strip]",
        )
      ),
    containScroll: false,
    duration: reduceMotion ? 0 : 25,
    breakpoints: { "(min-width: 768px)": { active: false } },
  });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!api) return;
    const updateSelected = () => setSelected(api.selectedScrollSnap());
    updateSelected();
    api.on("select", updateSelected);
    api.on("reInit", updateSelected);
    return () => {
      api.off("select", updateSelected);
      api.off("reInit", updateSelected);
    };
  }, [api]);

  return (
    <div
      ref={carouselRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Practice features. Swipe or use left and right arrow keys to explore."
      tabIndex={0}
      // Contain Radix's hidden inputs before Embla adds a transform on hydration.
      className="relative w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:hidden"
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          if (event.key === "ArrowLeft") api?.scrollPrev();
          else api?.scrollNext();
        }
      }}
    >
      <div className="flex touch-pan-y py-1">
        {PRACTICE_FEATURES.map((feature, index) => {
          const Icon = feature.icon;

          return (
            <article
              key={feature.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${feature.title}, ${index + 1} of ${PRACTICE_FEATURES.length}`}
              aria-hidden={selected !== index}
              inert={selected !== index}
              className="mr-3 flex min-w-0 flex-[0_0_84%] flex-col overflow-hidden rounded-xl border bg-background shadow-sm"
            >
              <div
                className={cn(
                  styles.previewSurface,
                  "flex min-h-[450px] flex-1 items-center justify-center border-b border-foreground/15 p-4",
                )}
              >
                <DeferredFeaturePreview
                  feature={feature.id}
                  surface="mobile"
                  active={active && selected === index}
                />
              </div>
              <div className="px-5 pb-6 pt-5">
                <h3 className="baseFlex !justify-start gap-2 text-xl font-semibold tracking-tight">
                  <Icon className="size-[18px]" />
                  {feature.title}
                </h3>
              </div>
            </article>
          );
        })}
      </div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {PRACTICE_FEATURES[selected]?.title}
      </span>
    </div>
  );
}

export default function FeatureShowcase() {
  const [mode, setMode] = useState<FeatureMode>("Practice");
  const desktop = useViewportWidthBreakpoint(768);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const features = mode === "Practice" ? PRACTICE_FEATURES : EDITING_FEATURES;
  const activeFeature = features[selectedIndex] ?? features[0]!;

  function selectFeature(index: number) {
    setSelectedIndex(index);
  }

  function handleFeatureKeys(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next: number;
    switch (event.key) {
      case "ArrowDown":
        next = (index + 1) % features.length;
        break;
      case "ArrowUp":
        next = (index - 1 + features.length) % features.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = features.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectFeature(next);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }

  return (
    <section
      aria-labelledby="platform-features-heading"
      className="w-full [overflow-anchor:none] md:max-w-[1200px] md:px-6 lg:px-8"
    >
      <h2
        id="platform-features-heading"
        className="mb-5 px-4 text-2xl font-bold tracking-tight md:px-0 md:text-3xl"
      >
        Features you&apos;ll love
      </h2>

      <div className="hidden gap-6 md:grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-10">
        <div className="flex flex-col gap-3 self-start" data-feature-navigation>
          <AnimatedToggleGroup
            aria-label="Choose platform features"
            variant="inverse"
            className="mb-4 w-fit self-start"
            value={mode}
            onValueChange={(name) => {
              if (name !== mode) {
                setMode(name);
                setSelectedIndex(0);
              }
            }}
            itemClassName="h-[38px] px-4 text-sm"
            options={[
              {
                value: "Practice",
                label: (
                  <>
                    <Play className="size-4" />
                    Practice
                  </>
                ),
              },
              {
                value: "Compose",
                label: (
                  <>
                    <MdModeEditOutline className="size-[18px]" />
                    Compose
                  </>
                ),
              },
            ]}
          />

          <div
            role="tablist"
            aria-label={`${mode} features`}
            aria-orientation="vertical"
            className="flex flex-col justify-center gap-2"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const active = index === selectedIndex;
              return (
                <button
                  key={feature.id}
                  type="button"
                  role="tab"
                  id={`feature-tab-${feature.id}`}
                  aria-selected={active}
                  aria-controls={
                    active ? `feature-panel-${feature.id}` : undefined
                  }
                  tabIndex={active ? 0 : -1}
                  onClick={() => selectFeature(index)}
                  onKeyDown={(event) => handleFeatureKeys(event, index)}
                  className={cn(
                    "group flex w-96 items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:p-5",
                    active
                      ? "border-primary/35 bg-background shadow-sm"
                      : "border-transparent hover:bg-background/50",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/60",
                    )}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-sm font-semibold tracking-tight lg:text-base">
                      <span>{feature.title}</span>
                      <ArrowRight
                        aria-hidden="true"
                        className={cn(
                          "size-4 shrink-0 text-primary transition-opacity",
                          active ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <AnimatedPreview
          feature={activeFeature}
          reduceMotion={Boolean(reduceMotion)}
          active={desktop === true}
        />
      </div>

      <PracticeCarousel active={desktop === false} />
    </section>
  );
}
