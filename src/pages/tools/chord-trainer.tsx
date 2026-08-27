import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Head from "next/head";
import { BsFillVolumeUpFill } from "react-icons/bs";
import { Paintbrush } from "lucide-react";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import ChordTrainerBpmRange, {
  clampChordTrainerTempo,
} from "~/components/tools/ChordTrainerBpmRange";
import ChordTrainerStrumPreview from "~/components/tools/ChordTrainerStrumPreview";
import ChordTrainerVisualizer from "~/components/tools/ChordTrainerVisualizer";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";
import { Button } from "~/components/ui/button";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { chordTrainerPresets } from "~/data/tools/chordTrainerPresets";
import {
  CHORD_TRAINER_STRUMMING_PATTERNS,
  getChordTrainerStrummingPattern,
  NONE_CHORD_TRAINER_STRUMMING_PATTERN,
} from "~/data/tools/chordTrainerStrummingPatterns";
import useChordTrainerPlayback from "~/hooks/useChordTrainerPlayback";
import { cn } from "~/utils/cn";
import Logo from "~/components/ui/icons/Logo";
import { useTabStore } from "~/stores/TabStore";

type AudioOption =
  | "none"
  | "acoustic_guitar_nylon"
  | "acoustic_guitar_steel"
  | "electric_guitar_clean"
  | "electric_guitar_jazz";

type ChordTrainerSelectionPreset = {
  id: string;
  label: string;
  chordIds: string[];
};

const AUDIO_SOURCE_LABELS: Record<AudioOption, string> = {
  none: "None",
  acoustic_guitar_nylon: "Acoustic - Nylon",
  acoustic_guitar_steel: "Acoustic - Steel",
  electric_guitar_clean: "Electric - Clean",
  electric_guitar_jazz: "Electric - Jazz",
};

const DEFAULT_CHORD_PRESET_ID = "common-open";
const CUSTOM_CHORD_PRESET_ID = "custom";
const CHORD_SELECTION_PRESETS: ChordTrainerSelectionPreset[] = [
  {
    id: DEFAULT_CHORD_PRESET_ID,
    label: "Common open chords",
    chordIds: ["c", "g", "am", "f", "em", "d", "a", "e"],
  },
  {
    id: "pop-acoustic",
    label: "Pop / acoustic",
    chordIds: ["g", "d", "em", "c", "cadd9", "asus2", "dsus4", "am"],
  },
  {
    id: "key-of-c",
    label: "Key of C",
    chordIds: ["c", "f", "g", "am", "dm", "em", "cmaj7", "g7"],
  },
  {
    id: "key-of-g",
    label: "Key of G",
    chordIds: ["g", "c", "d", "em", "am", "cadd9", "g7", "d7"],
  },
  {
    id: "key-of-d",
    label: "Key of D",
    chordIds: ["d", "g", "a", "bm", "em", "dsus2", "dsus4", "a7"],
  },
  {
    id: "major-chords",
    label: "Major chords",
    chordIds: ["c", "g", "d", "a", "e", "f", "b"],
  },
  {
    id: "minor-chords",
    label: "Minor chords",
    chordIds: ["am", "em", "dm", "bm", "fsharpm"],
  },
  {
    id: "seventh-chords",
    label: "Seventh chords",
    chordIds: [
      "c7",
      "g7",
      "d7",
      "a7",
      "e7",
      "b7",
      "cmaj7",
      "fmaj7",
      "am7",
      "dm7",
      "em7",
    ],
  },
  {
    id: "suspended-and-add",
    label: "Suspended / add",
    chordIds: ["asus2", "asus4", "dsus2", "dsus4", "gsus4", "cadd9"],
  },
  {
    id: "all",
    label: "All chords",
    chordIds: chordTrainerPresets.map((preset) => preset.id),
  },
];

const DEFAULT_SELECTED_CHORD_IDS =
  CHORD_SELECTION_PRESETS.find(
    (preset) => preset.id === DEFAULT_CHORD_PRESET_ID,
  )?.chordIds ?? [];
const DEFAULT_TEMPO = 70;
const DEFAULT_STRUMMING_PATTERN_ID = NONE_CHORD_TRAINER_STRUMMING_PATTERN.id;
const CUSTOM_CHORD_PRESET_OPTION: ChordTrainerSelectionPreset = {
  id: CUSTOM_CHORD_PRESET_ID,
  label: "Custom",
  chordIds: [],
};
const CHORD_PRESET_OPTIONS = [
  ...CHORD_SELECTION_PRESETS,
  CUSTOM_CHORD_PRESET_OPTION,
];

function ChordTrainerPage() {
  const { setCurrentInstrumentName } = useTabStore((state) => ({
    setCurrentInstrumentName: state.setCurrentInstrumentName,
  }));

  const [activeChordPresetId, setActiveChordPresetId] = useState(
    DEFAULT_CHORD_PRESET_ID,
  );
  const [selectedChordIds, setSelectedChordIds] = useState<string[]>(() => [
    ...DEFAULT_SELECTED_CHORD_IDS,
  ]);
  const [tempo, setTempo] = useState(DEFAULT_TEMPO);
  const [strummingPatternId, setStrummingPatternId] = useState(
    DEFAULT_STRUMMING_PATTERN_ID,
  );
  const [audioOption, setAudioOption] = useState<AudioOption>(
    "acoustic_guitar_steel",
  );
  const [showColorCoding, setShowColorCoding] = useState(true);

  const selectedChordIdSet = useMemo(
    () => new Set(selectedChordIds),
    [selectedChordIds],
  );

  const selectedChords = useMemo(
    () =>
      chordTrainerPresets.filter((chord) => selectedChordIdSet.has(chord.id)),
    [selectedChordIdSet],
  );

  const activeChordPreset =
    CHORD_SELECTION_PRESETS.find(
      (preset) => preset.id === activeChordPresetId,
    ) ?? null;

  const isCustomChordPreset = activeChordPresetId === CUSTOM_CHORD_PRESET_ID;
  const selectedChordCount = selectedChords.length;
  const audioEnabled = audioOption !== "none";
  const selectedStrummingPattern =
    getChordTrainerStrummingPattern(strummingPatternId);
  const showStrumIcons = selectedStrummingPattern.showIcons;

  const {
    stageRef,
    sliderContainerRef,
    queue,
    currentItemIndex,
    isPlaying,
    pausePlayback,
    togglePlayback,
  } = useChordTrainerPlayback({
    selectedChords,
    strummingPattern: selectedStrummingPattern,
    tempo,
    audioEnabled,
    colorCoded: showColorCoding,
  });

  function handleTempoChange(nextTempo: number) {
    pausePlayback();
    setTempo(clampChordTrainerTempo(nextTempo));
  }

  function handleSelectOpenChange(open: boolean) {
    if (open) pausePlayback();
  }

  function handleStrummingPatternChange(nextPatternId: string) {
    pausePlayback();
    setStrummingPatternId(nextPatternId);
  }

  function handleAudioOptionChange(nextOption: string) {
    pausePlayback();
    setAudioOption(nextOption as AudioOption);
    setCurrentInstrumentName(
      nextOption as
        | "acoustic_guitar_nylon"
        | "acoustic_guitar_steel"
        | "electric_guitar_clean"
        | "electric_guitar_jazz",
    );
  }

  function handleColorCodingToggle() {
    pausePlayback();
    setShowColorCoding((previous) => !previous);
  }

  function handleChordPresetSelect(nextPresetId: string) {
    pausePlayback();

    if (nextPresetId === CUSTOM_CHORD_PRESET_ID) {
      setActiveChordPresetId(CUSTOM_CHORD_PRESET_ID);
      return;
    }

    const nextPreset = CHORD_SELECTION_PRESETS.find(
      (preset) => preset.id === nextPresetId,
    );

    if (!nextPreset) return;

    setActiveChordPresetId(nextPreset.id);
    setSelectedChordIds([...nextPreset.chordIds]);
  }

  function handleChordToggle(chordId: string) {
    pausePlayback();
    setActiveChordPresetId(CUSTOM_CHORD_PRESET_ID);
    setSelectedChordIds((previous) => {
      const sourceIds = isCustomChordPreset
        ? previous
        : (activeChordPreset?.chordIds ?? previous);

      if (sourceIds.includes(chordId)) {
        return sourceIds.filter((id) => id !== chordId);
      }

      return [...sourceIds, chordId];
    });
  }

  return (
    <motion.div
      key={"tools-chord-trainer"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-8 min-h-[calc(100dvh-4rem-4rem)] w-full max-w-[1240px] gap-6 pb-8 md:my-16 md:min-h-[calc(100dvh-4rem-8rem)]"
    >
      <Head>
        <title>Chord Trainer | Autostrum</title>
        <meta
          name="description"
          content="Practice chord changes with a continuous randomized stream of chord diagrams and optional guitar playback."
        />
      </Head>

      <ToolRouteHeader
        icon={<Logo className="size-5" />}
        title="Chord Trainer"
        description="Pick a chord set, or make your own, and practice smoother transitions between shapes."
      />

      <div className="baseVertFlex w-full xs:px-4 sm:px-6 md:px-8">
        <div className="baseVertFlex w-full">
          <ChordTrainerVisualizer
            stageRef={stageRef}
            sliderContainerRef={sliderContainerRef}
            queue={queue}
            currentItemIndex={currentItemIndex}
            patternLength={selectedStrummingPattern.strums.length}
            showColorCoding={showColorCoding}
            showStrumIcons={showStrumIcons}
          />

          <div className="baseVertFlex my-8 w-full max-w-[375px] gap-6 px-8 md:max-w-[500px] md:px-0">
            <div className="baseVertFlex w-full gap-6 md:!flex-row md:!items-start md:gap-8">
              <ChordTrainerBpmRange
                tempo={tempo}
                onTempoChange={handleTempoChange}
                className=""
              />

              <div className="baseVertFlex w-full !items-start gap-2 md:w-auto">
                <Label
                  htmlFor="chord-trainer-strumming-pattern"
                  className="font-medium"
                >
                  Strumming pattern
                </Label>

                <Select
                  value={strummingPatternId}
                  onOpenChange={handleSelectOpenChange}
                  onValueChange={handleStrummingPatternChange}
                >
                  <SelectTrigger
                    id="chord-trainer-strumming-pattern"
                    className="w-[200px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHORD_TRAINER_STRUMMING_PATTERNS.map((pattern) => (
                      <SelectItem
                        key={pattern.id}
                        value={pattern.id}
                        aria-label={pattern.label}
                      >
                        <div className="baseFlex gap-3">
                          {pattern.showIcons && (
                            <ChordTrainerStrumPreview strums={pattern.strums} />
                          )}
                          {pattern.label === "None" && (
                            <span>{pattern.label}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="baseVertFlex w-full !items-start gap-6 md:!flex-row md:!items-end md:gap-3">
              <div className="baseVertFlex !items-start gap-2">
                <Label htmlFor="chordTrainerInstrument">Instrument</Label>

                <Select
                  value={audioOption}
                  onOpenChange={handleSelectOpenChange}
                  onValueChange={handleAudioOptionChange}
                >
                  <SelectTrigger
                    id="chordTrainerInstrument"
                    className="w-[200px]"
                  >
                    <SelectValue>
                      <div className="baseFlex gap-2">
                        <BsFillVolumeUpFill className="size-5" />
                        {AUDIO_SOURCE_LABELS[audioOption]}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AUDIO_SOURCE_LABELS) as AudioOption[]).map(
                      (key) => (
                        <SelectItem key={key} value={key}>
                          {AUDIO_SOURCE_LABELS[key]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="baseFlex w-full gap-3 md:w-auto">
                <Button
                  type="button"
                  variant={showColorCoding ? "default" : "outline"}
                  onClick={handleColorCodingToggle}
                  className="w-full gap-2 md:w-auto"
                >
                  <Paintbrush className="size-4" />
                  Color-coded
                </Button>

                <Button
                  id="chord-trainer-start-pause"
                  variant="audio"
                  onClick={togglePlayback}
                  disabled={selectedChordCount === 0}
                  className="w-full gap-2 px-8 text-base md:w-[134px]"
                >
                  {isPlaying ? (
                    <PauseIcon className="size-4" />
                  ) : (
                    <Logo className="size-4" />
                  )}
                  {isPlaying ? "Pause" : "Start"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="baseVertFlex w-full !items-start gap-4 border-y bg-background p-4 shadow-md xs:rounded-md xs:border-x xs:p-6">
          <div className="baseVertFlex w-full !items-start lg:flex-row lg:gap-6">
            <aside className="hidden w-full max-w-[280px] flex-col gap-3 rounded-md lg:flex">
              <div className="baseVertFlex !items-start gap-1">
                <p className="ml-3 text-sm font-medium leading-none">
                  Chord presets
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {CHORD_PRESET_OPTIONS.map((preset) => {
                  const isActive = activeChordPresetId === preset.id;
                  const presetCount =
                    preset.id === CUSTOM_CHORD_PRESET_ID
                      ? selectedChordCount
                      : preset.chordIds.length;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleChordPresetSelect(preset.id)}
                      className={cn(
                        "baseVertFlex w-full !items-start gap-2 rounded-md border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        isActive
                          ? "border bg-background text-foreground shadow-sm"
                          : "border-transparent bg-background/55 text-foreground/80 hover:border-border hover:bg-background",
                      )}
                    >
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="text-sm">{preset.label}</span>
                        <span className="text-xs text-foreground/55">
                          {presetCount}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="baseVertFlex relative w-full !items-start gap-4">
              <div className="baseVertFlex sticky top-[3.75rem] z-10 w-full !items-start gap-2 bg-background pt-3 lg:hidden">
                <p className="text-sm font-medium leading-none">
                  Chord presets
                </p>

                <Select
                  value={activeChordPresetId}
                  onValueChange={handleChordPresetSelect}
                >
                  <SelectTrigger className="w-full bg-background xs:max-w-[320px]">
                    <SelectValue placeholder="Choose a chord preset" />
                  </SelectTrigger>

                  <SelectContent>
                    {CHORD_PRESET_OPTIONS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="baseVertFlex mt-2 w-full !items-start gap-1.5 lg:mt-0">
                <div className="baseFlex w-full !justify-between gap-3 lg:px-4">
                  <div className="baseVertFlex !items-start gap-1">
                    <p className="text-sm font-medium leading-none">Chords</p>
                  </div>

                  <span className="text-xs text-foreground/55">
                    {selectedChordCount} selected
                  </span>
                </div>
              </div>

              <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {chordTrainerPresets.map((chord) => {
                  const selected = selectedChordIdSet.has(chord.id);

                  return (
                    <div
                      key={chord.id}
                      className={cn(
                        "baseVertFlex gap-2 transition-opacity duration-150",
                        selected
                          ? "opacity-100"
                          : "opacity-35 hover:opacity-80",
                      )}
                    >
                      <Button
                        variant={"outline"}
                        style={
                          selected
                            ? showColorCoding
                              ? {
                                  borderColor: `${chord.color}66`,
                                  background: `linear-gradient(180deg, ${chord.color}14 0%, hsl(var(--background)) 100%)`,
                                  boxShadow: `0 0 0 1px ${chord.color}18 inset`,
                                }
                              : {
                                  borderColor: "hsl(var(--primary) / 0.42)",
                                  background: "hsl(var(--primary) / 0.06)",
                                  boxShadow:
                                    "0 0 0 1px hsl(var(--primary) / 0.14) inset",
                                }
                            : undefined
                        }
                        className="h-[112px] w-[88px] rounded-md border bg-background/80 p-1.5 text-foreground"
                        onClick={() => handleChordToggle(chord.id)}
                      >
                        <ChordDiagram originalFrets={chord.frets} />
                      </Button>

                      <span
                        className="text-sm font-semibold"
                        style={
                          selected && showColorCoding
                            ? { color: chord.color }
                            : undefined
                        }
                      >
                        {chord.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ChordTrainerPage;
