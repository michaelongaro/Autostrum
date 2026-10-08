import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Keyboard,
  Pause,
  Play,
  Repeat2,
  SlidersHorizontal,
} from "lucide-react";
import {
  getColorForChordName,
  getContrastTextColor,
} from "~/utils/chordColors";
import { cn } from "~/utils/cn";
import {
  PLAYBACK_SPEED_MAX,
  PLAYBACK_SPEED_MIN,
  PLAYBACK_SPEED_STEP,
  formatPlaybackSpeed,
} from "~/utils/playbackSpeedControls";
import styles from "./FeatureShowcase.module.css";

export type FeatureId =
  | "zoom"
  | "colors"
  | "speed"
  | "loop"
  | "navigation"
  | "autoscroll"
  | "hotkeys"
  | "tuning";

const STRINGS = ["e", "B", "G", "D", "A", "E"];
const NOTES = [
  ["3", "", "0", "", "0", "", "3", ""],
  ["", "0", "", "0", "", "0", "", "0"],
  ["", "", "0", "", "0", "", "", ""],
  ["", "", "", "2", "", "", "0", ""],
  ["", "", "", "", "3", "", "", ""],
  ["3", "", "", "", "", "", "3", ""],
];
const CHORDS = ["G", "G", "Em", "Em", "C", "C", "D", "D"];

function PreviewCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-foreground/20 bg-background p-4 shadow-sm md:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

function PreviewHeading({
  children,
  detail,
}: {
  children: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold">{children}</span>
      <span className="text-xs text-foreground/65">{detail}</span>
    </div>
  );
}

function TabStaff({
  highlighted = -1,
  className,
}: {
  highlighted?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 420 144"
      aria-hidden="true"
      className={cn("block w-full overflow-visible", className)}
      fill="none"
    >
      {highlighted >= 0 && (
        <rect
          x={48 + highlighted * 44}
          y="5"
          width="30"
          height="127"
          rx="5"
          className="fill-primary/15"
        />
      )}
      {STRINGS.map((string, row) => (
        <g key={string}>
          <text
            x="7"
            y={20 + row * 22}
            dominantBaseline="middle"
            className="fill-foreground/50 font-mono text-xs"
          >
            {string}
          </text>
          <path
            d={`M28 ${20 + row * 22}H415`}
            className="stroke-foreground/25"
          />
          {NOTES[row]?.map((note, column) =>
            note ? (
              <g key={column}>
                <rect
                  x={55 + column * 44}
                  y={12 + row * 22}
                  width="17"
                  height="17"
                  rx="3"
                  className="fill-background"
                />
                <text
                  x={63 + column * 44}
                  y={21 + row * 22}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={cn(
                    "font-mono text-base font-medium",
                    highlighted === column ? "fill-primary" : "fill-foreground",
                  )}
                >
                  {note}
                </text>
              </g>
            ) : null,
          )}
        </g>
      ))}
      <path
        d="M28 20V130M239 20V130M415 20V130"
        className="stroke-foreground/35"
      />
    </svg>
  );
}

function StrummingRow({ colored = false }: { colored?: boolean }) {
  return (
    <div aria-hidden="true" className="grid grid-cols-8 gap-1">
      {CHORDS.map((chord, index) => {
        const color = colored ? getColorForChordName(chord) : null;
        const Icon = index % 2 === 0 ? ArrowDown : ArrowUp;
        return (
          <div key={index} className="flex flex-col items-center gap-2">
            <span
              style={{
                backgroundColor:
                  index % 2 === 0 ? (color ?? undefined) : undefined,
                color: color ? getContrastTextColor(color) : undefined,
              }}
              className="flex h-5 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold md:h-6 md:min-w-8 md:text-xs"
            >
              {index % 2 === 0 ? chord : "\u00a0"}
            </span>
            <Icon
              style={{ color: color ?? undefined }}
              className="size-6 md:size-8"
            />
            <span className="text-[10px] text-foreground/55 md:text-xs">
              {index % 2 === 0 ? index / 2 + 1 : "&"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DemoRange({
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  valueLabel: string;
}) {
  return (
    <label className="flex w-full flex-col gap-3 text-sm">
      <span className="flex items-center justify-between gap-3">
        <span className="font-medium">{label}</span>
        <span className="font-semibold tabular-nums text-primary">
          {valueLabel}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueLabel}
        onChange={(event) => onChange(Number(event.target.value))}
        className={styles.range}
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) ${((value - min) / (max - min)) * 100}%, hsl(var(--foreground) / 0.18) 0%)`,
        }}
      />
      <span className="flex justify-between text-[11px] text-foreground/60">
        <span>{min}×</span>
        <span>{max}×</span>
      </span>
    </label>
  );
}

function ZoomPreview() {
  const [zoom, setZoom] = useState(1.2);
  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <PreviewCard className="overflow-hidden">
        <PreviewHeading detail="Standard tuning">Verse</PreviewHeading>
        <div className="flex h-28 items-center overflow-hidden md:h-44">
          <div
            className="w-full shrink-0 origin-left motion-safe:transition-transform motion-safe:duration-150"
            style={{ transform: `scale(${zoom})` }}
          >
            <TabStaff />
          </div>
        </div>
      </PreviewCard>
      <PreviewCard className="mx-auto max-w-sm">
        <DemoRange
          label="Zoom"
          value={zoom}
          min={0.5}
          max={1.5}
          step={0.1}
          onChange={setZoom}
          valueLabel={`${zoom}×`}
        />
      </PreviewCard>
    </div>
  );
}

function ColorsPreview() {
  return (
    <div className="flex w-full flex-col gap-3 md:gap-5">
      <PreviewCard>
        <PreviewHeading detail="Color off">Same chords</PreviewHeading>
        <StrummingRow />
      </PreviewCard>
      <PreviewCard>
        <PreviewHeading
          detail={
            <span className="flex items-center gap-1 text-primary">
              <Check className="size-3.5" /> Color on
            </span>
          }
        >
          Easier to recognize
        </PreviewHeading>
        <StrummingRow colored />
      </PreviewCard>
    </div>
  );
}

function SpeedPreview() {
  const [speed, setSpeed] = useState(0.75);
  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <PreviewCard>
        <PreviewHeading detail="120 BPM original">
          Find your pace
        </PreviewHeading>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Play className="size-5" />
          </span>
          <span className="text-3xl font-semibold tabular-nums tracking-tight md:text-4xl">
            {Math.round(120 * speed)}{" "}
            <span className="text-sm font-normal text-foreground/60">BPM</span>
          </span>
        </div>
        <TabStaff highlighted={2} className="max-h-20 md:max-h-none" />
      </PreviewCard>
      <PreviewCard className="mx-auto max-w-sm">
        <DemoRange
          label="Playback speed"
          value={speed}
          min={PLAYBACK_SPEED_MIN}
          max={PLAYBACK_SPEED_MAX}
          step={PLAYBACK_SPEED_STEP}
          onChange={setSpeed}
          valueLabel={formatPlaybackSpeed(speed)}
        />
      </PreviewCard>
    </div>
  );
}

function LoopPreview() {
  const [looping, setLooping] = useState(true);
  const [delay, setDelay] = useState("0");
  return (
    <PreviewCard>
      <PreviewHeading detail="Chorus">One more time</PreviewHeading>
      <div className="relative rounded-lg border border-foreground/15 px-2 pb-3 pt-6 md:pb-6 md:pt-10">
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-[26%] right-[12%] border-x-2 transition-colors",
            looping ? "border-primary bg-primary/10" : "border-transparent",
          )}
        />
        <div className="relative">
          <StrummingRow colored />
        </div>
      </div>
      <div className="mb-5 mt-4 flex items-center gap-2 text-xs text-foreground/60">
        <span>0:00</span>
        <div
          aria-hidden="true"
          className="relative h-2 flex-1 rounded-full bg-foreground/15"
        >
          <div
            className={cn(
              "absolute inset-y-0 left-[25%] right-[12%] rounded-full",
              looping && "bg-primary/50",
            )}
          />
          <div className="absolute -top-1 left-[25%] h-4 w-1.5 rounded bg-primary" />
          <div className="absolute -top-1 right-[12%] h-4 w-1.5 rounded bg-primary" />
        </div>
        <span>0:24</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <button
          type="button"
          aria-pressed={looping}
          onClick={() => setLooping(!looping)}
          className={cn(
            styles.demoButton,
            "gap-2",
            looping && "border-primary/50 bg-primary/10 text-primary",
          )}
        >
          <Repeat2 className="size-4" /> Loop {looping ? "on" : "off"}
        </button>
        <label className="flex flex-col gap-1.5 text-xs text-foreground/65">
          Loop delay
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
            value={delay}
            onChange={(event) => setDelay(event.target.value)}
          >
            {["0", "1", "2", "3", "5"].map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds}s
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-4 text-center text-xs text-foreground/65">
        Repeat a section. Leave room to reset.
      </p>
    </PreviewCard>
  );
}

function NavigationPreview() {
  const [selected, setSelected] = useState(9);
  return (
    <div className="flex w-full flex-col gap-6">
      <PreviewCard>
        <PreviewHeading detail={<Keyboard className="size-4" />}>
          Keep your hands on the keys
        </PreviewHeading>
        <div className="flex flex-col gap-2 py-3">
          {STRINGS.map((string, row) => (
            <div key={string} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="w-3 font-mono text-xs text-foreground/50"
              >
                {string}
              </span>
              <div className="relative grid flex-1 grid-cols-8 gap-1">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-1/2 h-px bg-foreground/25"
                />
                {Array.from({ length: 8 }, (_, column) => {
                  const index = row * 8 + column;
                  return (
                    <button
                      key={column}
                      type="button"
                      aria-label={`String ${string}, position ${column + 1}, fret ${NOTES[row]?.[column] || "empty"}`}
                      aria-pressed={selected === index}
                      tabIndex={selected === index ? 0 : -1}
                      className={cn(
                        "relative mx-auto flex size-7 items-center justify-center rounded border border-transparent bg-background font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected === index &&
                          "border-primary bg-primary/10 text-primary",
                      )}
                      onFocus={() => setSelected(index)}
                      onClick={() => setSelected(index)}
                      onKeyDown={(event) => {
                        const offsets: Record<string, number> = {
                          ArrowLeft: -1,
                          ArrowRight: 1,
                          ArrowUp: -8,
                          ArrowDown: 8,
                        };
                        const offset = offsets[event.key];
                        if (offset === undefined) return;
                        event.preventDefault();
                        const next = Math.max(0, Math.min(47, index + offset));
                        const buttons = event.currentTarget
                          .closest("[data-note-grid]")
                          ?.querySelectorAll<HTMLButtonElement>("button");
                        buttons?.[next]?.focus();
                      }}
                    >
                      {NOTES[row]?.[column] || "\u00a0"}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PreviewCard>
      <div aria-hidden="true" className="flex justify-center gap-2">
        {[ArrowLeft, ArrowUp, ArrowDown, ArrowRight].map((Icon, index) => (
          <span
            key={index}
            className="flex size-11 items-center justify-center rounded-lg border border-b-[3px] bg-background shadow-sm"
          >
            <Icon className="size-4" />
          </span>
        ))}
      </div>
      <p className="text-center text-xs text-foreground/65">
        Click a note, then try your arrow keys.
      </p>
    </div>
  );
}

function AutoscrollPreview() {
  const [playing, setPlaying] = useState(false);
  return (
    <PreviewCard>
      <PreviewHeading
        detail={
          <span className="flex items-center gap-1 text-primary">
            <Check className="size-3.5" /> Autoscroll on
          </span>
        }
      >
        Follow every note
      </PreviewHeading>
      <div className={styles.autoscrollWindow}>
        <div
          className={cn(
            styles.autoscrollTrack,
            playing && styles.autoscrollPlaying,
          )}
        >
          {["Verse", "Chorus", "Verse", "Chorus"].map((section, index) => (
            <div key={index} className={styles.autoscrollMeasure}>
              <p className="mb-3 text-xs font-medium text-foreground/60">
                {section}
              </p>
              <TabStaff highlighted={playing ? 3 : -1} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          aria-pressed={playing}
          className={cn(styles.demoButton, "gap-2")}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? "Pause preview" : "Preview autoscroll"}
        </button>
        <span className="text-xs text-foreground/60">120 BPM</span>
      </div>
    </PreviewCard>
  );
}

const HOTKEYS = [
  { keys: ["Space"], action: "Play / pause" },
  { keys: ["q", "/", "w"], action: "Insert a chord before / after" },
  { keys: ["Shift", "↑ / ↓"], action: "Change note length" },
  { keys: ["Ctrl", "C / V"], action: "Copy / paste a chord" },
  { keys: ["A–G", "/", "a–g"], action: "Major / minor chords" },
];

function HotkeysPreview() {
  return (
    <PreviewCard>
      <PreviewHeading detail={<Keyboard className="size-4" />}>
        A few keys. A smoother workflow.
      </PreviewHeading>
      <div className="divide-y divide-foreground/10">
        {HOTKEYS.map(({ keys, action }) => (
          <div
            key={action}
            className="flex items-center justify-between gap-4 py-4 text-sm"
          >
            <span className="text-foreground/75">{action}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              {keys.map((key) =>
                key === "/" ? (
                  <span key={key} className="text-foreground/40">
                    /
                  </span>
                ) : (
                  <kbd key={key} className={styles.key}>
                    {key}
                  </kbd>
                ),
              )}
            </span>
          </div>
        ))}
      </div>
    </PreviewCard>
  );
}

const TUNINGS = {
  Standard: ["E2", "A2", "D3", "G3", "B3", "E4"],
  "Drop D": ["D2", "A2", "D3", "G3", "B3", "E4"],
  DADGAD: ["D2", "A2", "D3", "G3", "A3", "D4"],
};

function TuningPreview() {
  const [tuning, setTuning] = useState<keyof typeof TUNINGS>("Drop D");
  return (
    <PreviewCard>
      <PreviewHeading detail={<SlidersHorizontal className="size-4" />}>
        Custom tuning editor
      </PreviewHeading>
      <div className="mb-6 flex gap-2">
        {(Object.keys(TUNINGS) as (keyof typeof TUNINGS)[]).map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={tuning === name}
            onClick={() => setTuning(name)}
            className={cn(
              styles.demoButton,
              "flex-1 px-2 text-xs",
              tuning === name && "border-primary/50 bg-primary/10 text-primary",
            )}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-foreground/15 bg-secondary/40 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium">
          <span className="rounded bg-primary/10 px-2 py-1 text-primary">
            Auto
          </span>
          Start with six notes
        </div>
        <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2 font-mono text-sm">
          {TUNINGS[tuning].map((note) => note.slice(0, -1)).join(" ")}
          <ChevronDown className="size-3.5 text-foreground/50" />
        </div>
      </div>
      <div className="my-4 flex items-center gap-3 text-xs text-foreground/55">
        <span className="h-px flex-1 bg-foreground/15" /> Fine-tune every string{" "}
        <span className="h-px flex-1 bg-foreground/15" />
      </div>
      <div className="grid grid-cols-6 gap-2">
        {TUNINGS[tuning].map((note, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <span className="text-[10px] text-foreground/55">
              String {6 - index}
            </span>
            <span
              className={cn(
                "flex h-11 w-full items-center justify-center rounded-md border bg-background font-mono text-sm font-semibold",
                index === 0 &&
                  tuning !== "Standard" &&
                  "border-primary/50 text-primary",
              )}
            >
              {note}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-xs text-foreground/65">
        Quick note entry or precise notes and octaves.
      </p>
    </PreviewCard>
  );
}

export default function FeaturePreview({ feature }: { feature: FeatureId }) {
  switch (feature) {
    case "zoom":
      return <ZoomPreview />;
    case "colors":
      return <ColorsPreview />;
    case "speed":
      return <SpeedPreview />;
    case "loop":
      return <LoopPreview />;
    case "navigation":
      return (
        <div data-note-grid className="w-full">
          <NavigationPreview />
        </div>
      );
    case "autoscroll":
      return <AutoscrollPreview />;
    case "hotkeys":
      return <HotkeysPreview />;
    case "tuning":
      return <TuningPreview />;
  }
}
