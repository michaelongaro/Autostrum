import { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { CgArrowsShrinkH } from "react-icons/cg";
import PlaybackAudioRange from "~/components/AudioControls/PlaybackAudioRange";
import type { PlaybackPracticeControls } from "~/components/Tab/Playback/PlaybackModal";
import CustomTuningDialog from "~/components/Dialogs/CustomTuningDialog";
import TabSection from "~/components/Tab/TabSection";
import SectionContainer from "~/components/Tab/SectionContainer";
import AnimatedListItem from "~/components/Tab/AnimatedListItem";
import TabZoomControl from "~/components/Tab/TabZoomControl";
import StaticTabSection from "~/components/Tab/Static/StaticTabSection";
import StaticChordSection from "~/components/Tab/Static/StaticChordSection";
import PlaybackLoopRangeActions from "~/components/Tab/Playback/PlaybackLoopRangeActions";
import PlaybackSpeedPopover from "~/components/ui/PlaybackSpeedPopover";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Toggle } from "~/components/ui/toggle";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import PlayIcon from "~/components/ui/icons/PlayIcon";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import Spinner from "~/components/ui/Spinner";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import useAutoscrollToCurrentChord from "~/hooks/useAutoscrollToCurrentChord";
import { useTabStore, useTabStoreApi } from "~/stores/TabStore";
import FeatureDemoSession, { useFeatureDemo } from "./FeatureDemoSession";
import styles from "./FeatureShowcase.module.css";

export type FeatureId =
  | "zoom"
  | "colors"
  | "speed"
  | "loop"
  | "reordering"
  | "autoscroll"
  | "hotkeys"
  | "tuning";

const EmbeddedPlaybackModal = dynamic(
  () => import("~/components/Tab/Playback/PlaybackModal"),
);

function DemoPlaybackButton({
  presentation = "button",
  disabled = false,
}: {
  presentation?: "button" | "icon";
  disabled?: boolean;
} = {}) {
  const { active } = useFeatureDemo();
  const store = useTabStoreApi();
  const playing = useTabStore((state) => state.audioMetadata.playing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function togglePlayback() {
    if (playing) {
      store.getState().pauseAudio();
      return;
    }
    setError(false);
    setLoading(true);
    try {
      if (await store.getState().ensureAudioSystemReady()) {
        void store
          .getState()
          .playTab({})
          .catch(() => setError(true));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="audio"
        disabled={!active || loading || disabled}
        aria-label={playing ? "Pause example" : "Play example"}
        onClick={() => void togglePlayback()}
        className={
          presentation === "icon"
            ? "size-10 shrink-0 rounded-full border-none bg-transparent p-0 text-foreground hover:bg-audio hover:text-audio-foreground"
            : "gap-2 px-4"
        }
      >
        {loading ? (
          <Spinner className="size-4" />
        ) : playing ? (
          <PauseIcon className="size-4" />
        ) : (
          <PlayIcon className="size-4" />
        )}
        {presentation === "button" &&
          (loading ? "Loading" : playing ? "Pause" : "Play")}
      </Button>
      {error && (
        <span role="status" className="text-xs">
          Audio couldn’t load. Try again.
        </span>
      )}
    </div>
  );
}

function PracticeTab() {
  const { sectionIndex } = useFeatureDemo();
  const { subSection, color, theme } = useTabStore((state) => ({
    subSection: state.tabData[sectionIndex]?.data[0],
    color: state.color,
    theme: state.theme,
  }));
  if (subSection?.type !== "tab") return null;
  return (
    <StaticTabSection
      subSectionData={subSection}
      sectionIndex={sectionIndex}
      subSectionIndex={0}
      color={color}
      theme={theme}
      overflowX
      presentation="bare"
    />
  );
}

function ZoomPreview() {
  const [zoom, setZoom] = useState(1);
  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <div
        className={styles.practiceViewport}
        tabIndex={0}
        aria-label="Tab preview"
      >
        <div style={{ zoom }}>
          <PracticeTab />
        </div>
      </div>
      <div
        className="w-full self-center rounded-lg border bg-background p-4 md:w-3/4"
        data-feature-control
      >
        <TabZoomControl zoom={zoom} onZoomChange={setZoom} />
      </div>
    </div>
  );
}

function ColorsPreview() {
  const { sectionIndex } = useFeatureDemo();
  const switchId = useId();
  const { subSection, color, theme, chordDisplayMode, setChordDisplayMode } =
    useTabStore((state) => ({
      subSection: state.tabData[sectionIndex]?.data[0],
      color: state.color,
      theme: state.theme,
      chordDisplayMode: state.chordDisplayMode,
      setChordDisplayMode: state.setChordDisplayMode,
    }));
  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <div className="flex items-center justify-center">
        {subSection?.type === "chord" && (
          <StaticChordSection
            subSectionData={subSection}
            color={color}
            theme={theme}
            presentation="bare"
          />
        )}
      </div>
      <div
        className="flex items-center justify-center gap-3"
        data-feature-control
      >
        <Label htmlFor={switchId} className="text-foreground/70">
          Off
        </Label>
        <Switch
          id={switchId}
          aria-label="Color-coded chords"
          checked={chordDisplayMode === "color"}
          onCheckedChange={(checked) =>
            setChordDisplayMode(checked ? "color" : "text")
          }
        />
        <Label htmlFor={switchId} className="text-foreground/70">
          On
        </Label>
      </div>
    </div>
  );
}

function SpeedPreview() {
  const controlId = useId();
  const { playbackSpeed, setPlaybackSpeed, pauseAudio } = useTabStore(
    (state) => ({
      playbackSpeed: state.playbackSpeed,
      setPlaybackSpeed: state.setPlaybackSpeed,
      pauseAudio: state.pauseAudio,
    }),
  );
  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <div className={styles.practiceViewport}>
        <PracticeTab />
      </div>
      <div className="flex w-full flex-wrap items-center justify-between gap-3 self-center rounded-lg border bg-background p-4 md:w-3/4">
        <DemoPlaybackButton />
        <div className="flex items-center gap-2">
          <Label htmlFor={controlId}>Speed</Label>
          <PlaybackSpeedPopover
            id={controlId}
            playbackSpeed={playbackSpeed}
            onPlaybackSpeedChange={(speed) => {
              pauseAudio();
              setPlaybackSpeed(speed);
            }}
            side="top"
            triggerClassName="w-[85px]"
          />
        </div>
      </div>
    </div>
  );
}

function LoopControls({
  chordDurations,
  setChordRepetitions,
  scrollPositionsLength,
  isGlideScrubbing,
  loopRangePrompt,
}: PlaybackPracticeControls) {
  const { sectionIndex } = useFeatureDemo();
  const store = useTabStoreApi();
  const { audioMetadata, currentChordIndex, playbackMetadata } = useTabStore(
    (state) => ({
      audioMetadata: state.audioMetadata,
      currentChordIndex: state.currentChordIndex,
      playbackMetadata: state.playbackMetadata,
    }),
  );
  return (
    <div
      className="flex w-full flex-col gap-4 px-4 pb-4 pt-2"
      data-feature-control
    >
      <PlaybackAudioRange
        disabled={isGlideScrubbing}
        chordDurations={chordDurations}
        setChordRepetitions={setChordRepetitions}
        scrollPositionsLength={scrollPositionsLength}
        idPrefix={`feature-loop-${sectionIndex}`}
      />
      {audioMetadata.editingLoopRange ? (
        <>
          <p className="min-h-4 text-center text-xs text-foreground/70">
            {loopRangePrompt}
          </p>
          <PlaybackLoopRangeActions presentation="embedded" />
        </>
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span className="text-xs tabular-nums">
            {formatSecondsToMinutes(
              playbackMetadata?.[currentChordIndex]?.elapsedSeconds ?? 0,
            )}
          </span>
          <DemoPlaybackButton presentation="icon" disabled={isGlideScrubbing} />
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs tabular-nums">
              {formatSecondsToMinutes(
                playbackMetadata?.at(-1)?.elapsedSeconds ?? 0,
              )}
            </span>
            <Toggle
              variant="outline"
              aria-label="Edit loop range"
              disabled={audioMetadata.playing || isGlideScrubbing}
              pressed={audioMetadata.editingLoopRange}
              className="size-8 shrink-0 p-1"
              onPressedChange={() => {
                const state = store.getState();
                state.initDraftLoopRangeFromAudioMetadata();
                state.setCurrentChordIndex(state.audioMetadata.startLoopIndex);
                state.atomicallyUpdateAudioMetadata({ editingLoopRange: true });
              }}
            >
              <CgArrowsShrinkH className="size-6" />
            </Toggle>
          </div>
        </div>
      )}
    </div>
  );
}

function LoopPreview() {
  return (
    <EmbeddedPlaybackModal
      presentation="embedded"
      renderControls={(controls) => <LoopControls {...controls} />}
    />
  );
}

const HOTKEYS = [
  {
    keys: (
      <span
        className="flex items-center gap-0.5"
        aria-label="Left, up, down, and right arrow keys"
      >
        <ArrowLeft className="size-3" aria-hidden="true" />
        <ArrowUp className="size-3" aria-hidden="true" />
        <ArrowDown className="size-3" aria-hidden="true" />
        <ArrowRight className="size-3" aria-hidden="true" />
      </span>
    ),
    label: "Note navigation",
  },
  { keys: "Shift + ↑ / ↓", label: "Note length" },
  { keys: "Ctrl + C / V", label: "Copy / paste" },
  { keys: "A–G / a–g", label: "Major / minor" },
];

function HotkeysPreview() {
  const { sectionIndex } = useFeatureDemo();
  return (
    <div className={styles.editorViewport} data-feature-editor-scroll>
      <TabSection
        sectionIndex={sectionIndex}
        subSectionIndex={0}
        presentation="embedded"
      ></TabSection>
      <div
        className="mx-auto mt-4 grid w-[450px] grid-cols-2 place-items-center gap-2 !self-center"
        data-feature-hotkeys
      >
        {HOTKEYS.map(({ keys, label }) => (
          <div
            key={label}
            className="flex w-48 items-center justify-between gap-2 rounded-md border bg-background px-2 py-2 text-[11px]"
          >
            <kbd className="shrink-0 whitespace-nowrap !text-[11px]">
              {keys}
            </kbd>
            <span className="text-foreground/75">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReorderingPreview() {
  const sectionIds = useTabStore((state) => state.tabData.map(({ id }) => id));
  const [forceClose, setForceClose] = useState(false);
  return (
    <div className={styles.editorViewport} data-feature-editor-scroll>
      <div className="flex w-full min-w-0 flex-col gap-3">
        {sectionIds.map((sectionId, index) => (
          <AnimatedListItem key={sectionId}>
            <SectionContainer
              key={`${sectionId}-${index}`}
              sectionIndex={index}
              tabDataLength={sectionIds.length}
              forceCloseSectionAccordions={forceClose}
              setForceCloseSectionAccordions={setForceClose}
              presentation="embedded"
            />
          </AnimatedListItem>
        ))}
      </div>
    </div>
  );
}

function AutoscrollPreview() {
  const { sectionIndex } = useFeatureDemo();
  const switchId = useId();
  const [autoscroll, setAutoscroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  useAutoscrollToCurrentChord(autoscroll, scrollRef);
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
        <DemoPlaybackButton />
        <div className="flex items-center gap-2">
          <Label htmlFor={switchId}>Autoscroll</Label>
          <Switch
            id={switchId}
            checked={autoscroll}
            onCheckedChange={setAutoscroll}
          />
        </div>
      </div>
      <div
        ref={scrollRef}
        className={styles.autoscrollViewport}
        data-feature-editor-scroll
        tabIndex={0}
        aria-label="Scrollable tab example"
      >
        <TabSection
          sectionIndex={sectionIndex}
          subSectionIndex={0}
          presentation="embedded"
        />
      </div>
    </div>
  );
}

function DemoContent({ feature }: { feature: FeatureId }) {
  useAutoCompileChords();
  const store = useTabStoreApi();
  const { active } = useFeatureDemo();
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !active || !["hotkeys", "autoscroll"].includes(feature))
      return;
    let preparingPlayback = false;
    const handleSpace = (event: KeyboardEvent) => {
      if (
        event.code !== "Space" ||
        event.repeat ||
        event.defaultPrevented ||
        (event.target instanceof Element &&
          event.target.closest("button, [role='switch'], [role='combobox']"))
      )
        return;
      event.preventDefault();
      const state = store.getState();
      if (state.audioMetadata.playing) state.pauseAudio();
      else if (!preparingPlayback) {
        preparingPlayback = true;
        void state
          .ensureAudioSystemReady()
          .then((ready) => ready && store.getState().playTab({}))
          .catch(() => undefined)
          .finally(() => {
            preparingPlayback = false;
          });
      }
    };
    root.addEventListener("keydown", handleSpace);
    return () => root.removeEventListener("keydown", handleSpace);
  }, [active, feature, store]);
  let content;
  switch (feature) {
    case "zoom":
      content = <ZoomPreview />;
      break;
    case "colors":
      content = <ColorsPreview />;
      break;
    case "speed":
      content = <SpeedPreview />;
      break;
    case "loop":
      content = <LoopPreview />;
      break;
    case "reordering":
      content = <ReorderingPreview />;
      break;
    case "autoscroll":
      content = <AutoscrollPreview />;
      break;
    case "hotkeys":
      content = <HotkeysPreview />;
      break;
    case "tuning":
      content = <CustomTuningDialog presentation="inline" />;
      break;
  }
  return (
    <div ref={rootRef} className="flex w-full min-w-0 justify-center">
      {content}
    </div>
  );
}

export default function FeaturePreview({
  feature,
  active = true,
  surface = "desktop",
}: {
  feature: FeatureId;
  active?: boolean;
  surface?: "desktop" | "mobile";
}) {
  return (
    <FeatureDemoSession feature={feature} surface={surface} active={active}>
      <DemoContent feature={feature} />
    </FeatureDemoSession>
  );
}
