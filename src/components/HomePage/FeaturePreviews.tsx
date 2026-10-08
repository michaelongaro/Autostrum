import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
} from "lucide-react";
import CustomTuningDialog from "~/components/Dialogs/CustomTuningDialog";
import TabSection from "~/components/Tab/TabSection";
import TabZoomControl from "~/components/Tab/TabZoomControl";
import StaticTabSection from "~/components/Tab/Static/StaticTabSection";
import StaticChordSection from "~/components/Tab/Static/StaticChordSection";
import PlaybackStrummedChord from "~/components/Tab/Playback/PlaybackStrummedChord";
import PlaybackLoopRangeActions from "~/components/Tab/Playback/PlaybackLoopRangeActions";
import PlaybackSpeedPopover from "~/components/ui/PlaybackSpeedPopover";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import PlayIcon from "~/components/ui/icons/PlayIcon";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import Spinner from "~/components/ui/Spinner";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import useAutoscrollToCurrentChord from "~/hooks/useAutoscrollToCurrentChord";
import { useTabStore, useTabStoreApi } from "~/stores/TabStore";
import FeatureDemoSession, {
  createDemoData,
  useFeatureDemo,
} from "./FeatureDemoSession";
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

function DemoPlaybackButton() {
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
        disabled={!active || loading}
        aria-label={playing ? "Pause example" : "Play example"}
        onClick={() => void togglePlayback()}
        className="gap-2 px-4"
      >
        {loading ? (
          <Spinner className="size-4" />
        ) : playing ? (
          <PauseIcon className="size-4" />
        ) : (
          <PlayIcon className="size-4" />
        )}
        {loading ? "Loading" : playing ? "Pause" : "Play"}
      </Button>
      {error && (
        <span role="status" className="text-xs">
          Audio couldn’t load. Try again.
        </span>
      )}
    </div>
  );
}

function DemoReset() {
  const store = useTabStoreApi();
  const { sectionIndex, feature } = useFeatureDemo();
  return (
    <Button
      variant="link"
      className="h-auto gap-1 p-0 text-xs"
      onClick={() => {
        store.getState().pauseAudio(true);
        store.setState({
          tabData: createDemoData(sectionIndex, feature),
          currentChordIndex: 0,
          currentlyCopiedChord: null,
        });
      }}
    >
      <RotateCcw className="size-3" />
      Reset
    </Button>
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
    />
  );
}

function ZoomPreview() {
  const [zoom, setZoom] = useState(1);
  return (
    <div className="flex w-full flex-col gap-5">
      <div
        className={styles.practiceViewport}
        tabIndex={0}
        aria-label="Tab preview"
      >
        <div style={{ zoom }}>
          <PracticeTab />
        </div>
      </div>
      <div className="rounded-lg border bg-background p-4" data-feature-control>
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
    <div className="flex w-full flex-col gap-5">
      <div className="flex min-h-48 items-center justify-center">
        {subSection?.type === "chord" && (
          <StaticChordSection
            subSectionData={subSection}
            color={color}
            theme={theme}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4">
        <Label htmlFor={switchId}>Color-coded chords</Label>
        <Switch
          id={switchId}
          checked={chordDisplayMode === "color"}
          onCheckedChange={(checked) =>
            setChordDisplayMode(checked ? "color" : "text")
          }
        />
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
    <div className="flex w-full flex-col gap-5">
      <div className={styles.practiceViewport}>
        <PracticeTab />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-4">
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

function LoopPreview() {
  const { sectionIndex } = useFeatureDemo();
  const loopId = useId();
  const delayId = useId();
  const store = useTabStoreApi();
  const {
    chords,
    audioMetadata,
    currentChordIndex,
    currentlyPlayingMetadata,
    looping,
    setLooping,
    loopDelay,
    setLoopDelay,
    pauseAudio,
  } = useTabStore((state) => ({
    chords: state.chords,
    audioMetadata: state.audioMetadata,
    currentChordIndex: state.currentChordIndex,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    looping: state.looping,
    setLooping: state.setLooping,
    loopDelay: state.loopDelay,
    setLoopDelay: state.setLoopDelay,
    pauseAudio: state.pauseAudio,
  }));
  const currentLocation =
    currentlyPlayingMetadata?.[currentChordIndex]?.location;
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex justify-center overflow-x-auto rounded-lg border bg-background p-4">
        {chords.map((chord, index) => (
          <PlaybackStrummedChord
            key={chord.id}
            chordIndex={index}
            strum={index % 2 === 0 ? "v" : "^"}
            chordName={chord.name}
            chordColor={chord.color}
            noteLength="quarter"
            isFirstChord={index === 0}
            isFirstChordInTab={index === 0}
            isLastChord={index === chords.length - 1}
            isLastChordInTab={index === chords.length - 1}
            isHighlighted={
              audioMetadata.playing &&
              currentLocation?.sectionIndex === sectionIndex &&
              currentLocation.chordIndex === index
            }
            isDimmed={
              index < audioMetadata.startLoopIndex ||
              (audioMetadata.endLoopIndex !== -1 &&
                index > audioMetadata.endLoopIndex)
            }
            beatIndicator={String(index + 1)}
            prevChordNoteLength={index === 0 ? undefined : "quarter"}
            currentChordNoteLength="quarter"
            nextChordNoteLength={
              index === chords.length - 1 ? undefined : "quarter"
            }
            prevChordIsRest={false}
            currentChordIsRest={false}
            nextChordIsRest={false}
          />
        ))}
      </div>
      {audioMetadata.editingLoopRange ? (
        <PlaybackLoopRangeActions presentation="embedded" />
      ) : (
        <div className="flex items-center justify-between gap-2">
          <DemoPlaybackButton />
          <Button
            variant="outline"
            disabled={audioMetadata.playing}
            className="px-3"
            onClick={() => {
              const state = store.getState();
              state.initDraftLoopRangeFromAudioMetadata();
              state.setCurrentChordIndex(state.audioMetadata.startLoopIndex);
              state.atomicallyUpdateAudioMetadata({ editingLoopRange: true });
            }}
          >
            Set loop range
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3">
        <div className="flex items-center gap-2">
          <Label htmlFor={loopId}>Loop</Label>
          <Switch
            id={loopId}
            checked={looping}
            onCheckedChange={(checked) => {
              pauseAudio();
              setLooping(checked);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={delayId}>Delay</Label>
          <Select
            value={String(loopDelay)}
            onValueChange={(value) => {
              pauseAudio();
              setLoopDelay(Number(value));
            }}
          >
            <SelectTrigger id={delayId} className="w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3].map((delay) => (
                <SelectItem key={delay} value={String(delay)}>
                  {delay}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

const HOTKEYS = [
  { keys: "Q / W", label: "Insert before / after" },
  { keys: "Shift + ↑ / ↓", label: "Change note length" },
  { keys: "Ctrl + C / V", label: "Copy / paste a chord" },
  { keys: "A–G / a–g", label: "Major / minor chords" },
];

function EditorPreview({ variant }: { variant: "navigation" | "hotkeys" }) {
  const { sectionIndex } = useFeatureDemo();
  return (
    <div className="flex w-full flex-col gap-4">
      {variant === "hotkeys" ? (
        <div className="grid grid-cols-2 gap-2">
          {HOTKEYS.map(({ keys, label }) => (
            <div
              key={keys}
              className="flex flex-col items-start gap-1.5 rounded-lg border bg-background px-3 py-2"
            >
              <kbd>{keys}</kbd>
              <span className="text-xs text-foreground/75">{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="max-w-52 text-sm text-foreground/75">
            Click a note, then use the arrow keys to move.
          </p>
          <div className="grid grid-cols-3 gap-1" aria-hidden="true">
            <kbd className="col-start-2">
              <ArrowUp className="size-3" />
            </kbd>
            <kbd className="row-start-2">
              <ArrowLeft className="size-3" />
            </kbd>
            <kbd className="row-start-2">
              <ArrowDown className="size-3" />
            </kbd>
            <kbd className="row-start-2">
              <ArrowRight className="size-3" />
            </kbd>
          </div>
        </div>
      )}
      <div className={styles.editorViewport} data-feature-editor-scroll>
        <TabSection
          sectionIndex={sectionIndex}
          subSectionIndex={0}
          presentation="embedded"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-foreground/65">
          {variant === "hotkeys"
            ? "Click a note and try a shortcut."
            : "Type a fret number to change a note."}
        </span>
        <DemoReset />
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
    <div className="flex w-full flex-col gap-4">
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
      <p className="text-xs text-foreground/65">
        Press play to follow the notes as they sound.
      </p>
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
    if (
      !root ||
      !active ||
      !["navigation", "hotkeys", "autoscroll"].includes(feature)
    )
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
    case "navigation":
      content = <EditorPreview variant="navigation" />;
      break;
    case "autoscroll":
      content = <AutoscrollPreview />;
      break;
    case "hotkeys":
      content = <EditorPreview variant="hotkeys" />;
      break;
    case "tuning":
      content = <CustomTuningDialog presentation="inline" />;
      break;
  }
  return (
    <div ref={rootRef} className="flex w-full justify-center">
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
