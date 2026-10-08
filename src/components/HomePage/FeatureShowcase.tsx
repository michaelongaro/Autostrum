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
  ScanLine,
  SlidersHorizontal,
  ZoomIn,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type KeyboardEvent } from "react";
import { cn } from "~/utils/cn";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import FeaturePreview, { type FeatureId } from "./FeaturePreviews";
import styles from "./FeatureShowcase.module.css";

type Feature = {
  id: FeatureId;
  title: string;
  icon: LucideIcon;
};
type FeatureMode = "Practice" | "Editing";

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
    icon: SlidersHorizontal,
  },
  {
    id: "loop",
    title: "Loop the part you need",
    icon: Repeat2,
  },
];
const EDITING_FEATURES: Feature[] = [
  {
    id: "navigation",
    title: "Arrow key navigation",
    icon: Move,
  },
  {
    id: "autoscroll",
    title: "Autoscroll playback",
    icon: ScanLine,
  },
  {
    id: "hotkeys",
    title: "Useful hotkeys",
    icon: Keyboard,
  },
  {
    id: "tuning",
    title: "Advanced tuning editor",
    icon: SlidersHorizontal,
  },
];

function CrossfadePreview({
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
      transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeInOut" }}
      className="absolute inset-0 flex items-center justify-center p-4 lg:p-6"
    >
      <div className="w-full max-w-[540px]">
        <FeaturePreview feature={feature.id} active={active && isPresent} />
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
      className="w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:hidden"
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          if (event.key === "ArrowLeft") api?.scrollPrev();
          else api?.scrollNext();
        }
      }}
    >
      <div className="flex touch-pan-y gap-3 py-1">
        {PRACTICE_FEATURES.map((feature, index) => (
          <article
            key={feature.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${feature.title}, ${index + 1} of ${PRACTICE_FEATURES.length}`}
            aria-hidden={selected !== index}
            inert={selected !== index}
            className="flex min-w-0 flex-[0_0_84%] flex-col overflow-hidden rounded-xl border bg-background shadow-sm"
          >
            <div
              className={cn(
                styles.previewSurface,
                "flex min-h-[450px] flex-1 items-center justify-center border-b border-foreground/15 p-4",
              )}
            >
              <FeaturePreview
                feature={feature.id}
                surface="mobile"
                active={active && selected === index}
              />
            </div>
            <div className="px-5 pb-6 pt-5">
              <h3 className="text-xl font-semibold tracking-tight">
                {feature.title}
              </h3>
            </div>
          </article>
        ))}
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
  const [selection, setSelection] = useState({ Practice: 0, Editing: 0 });
  const reduceMotion = useReducedMotion();
  const features = mode === "Practice" ? PRACTICE_FEATURES : EDITING_FEATURES;
  const selectedIndex = selection[mode];
  const activeFeature = features[selectedIndex] ?? features[0]!;

  function selectFeature(index: number) {
    setSelection((previous) => ({ ...previous, [mode]: index }));
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
      className="w-full md:max-w-[1200px] md:px-6 lg:px-8"
    >
      <div className="mb-6 flex items-center justify-between gap-6 px-4 md:px-0">
        <div>
          <h2
            id="platform-features-heading"
            className="text-2xl font-bold tracking-tight md:text-3xl"
          >
            <span className="md:hidden">Practice your way</span>
            <span className="hidden md:inline">Your tab. Your way.</span>
          </h2>
          <p className="mt-2 text-sm text-foreground/75 md:text-base">
            <span className="md:hidden">
              A few thoughtful controls. A better practice session.
            </span>
            <span className="hidden md:inline">
              Thoughtful tools for learning a song and writing your own.
            </span>
          </p>
        </div>
        <div
          role="group"
          aria-label="Choose platform features"
          className="hidden shrink-0 gap-1 rounded-lg border bg-background p-1 md:flex"
        >
          {(["Practice", "Editing"] as const).map((name) => {
            const Icon = name === "Practice" ? Play : Keyboard;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={mode === name}
                onClick={() => setMode(name)}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  mode === name
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/65 hover:bg-secondary",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden gap-6 md:grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-10">
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
                  "group flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:p-5",
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
        <div
          className={cn(
            styles.previewSurface,
            "relative min-h-[660px] overflow-hidden rounded-xl border border-foreground/20",
          )}
        >
          <AnimatePresence initial={false} mode="sync">
            <CrossfadePreview
              key={activeFeature.id}
              feature={activeFeature}
              reduceMotion={Boolean(reduceMotion)}
              active={desktop === true}
            />
          </AnimatePresence>
        </div>
      </div>

      <PracticeCarousel active={desktop === false} />
    </section>
  );
}
