import extractNumber from "~/utils/extractNumber";
import type Soundfont from "soundfont-player";
import {
  playGuitarNote,
  playGuitarPercussion,
  stopGuitarStrings,
  type GuitarTransition as TetheredMetadata,
} from "~/utils/guitarEffects";
import {
  calculateAutomaticStrumSpreadSeconds,
  chordEffectCharsForNoteAudio,
  parseCompiledStrumSpread,
  remapStrumSpreadForType,
} from "~/utils/strumEffectHelpers";

export type StoppablePlaybackNode = { stop(when?: number): void };
const TUNING_PREVIEW_NOTE_DELAY_SECONDS = 0.35;

export function registerScheduledPlaybackNode(
  scheduledNodes: StoppablePlaybackNode[] | undefined,
  node: StoppablePlaybackNode | null | undefined,
) {
  if (scheduledNodes && node) scheduledNodes.push(node);
}

export function stopAllScheduledPlaybackNodes(
  scheduledNodes: StoppablePlaybackNode[],
  stopTime: number,
) {
  for (const node of scheduledNodes) {
    try {
      node.stop(stopTime);
    } catch {
      // Node may already have stopped.
    }
  }
}

export function stopActivePlaybackStrings(
  activePlaybackStrings:
    (Soundfont.Player | AudioBufferSourceNode | undefined)[] | null | undefined,
  stopTime: number,
) {
  if (activePlaybackStrings) stopGuitarStrings(activePlaybackStrings, stopTime);
}

interface PlayNote {
  tuning: number[];
  stringIdx: number;
  fret: number;
  fretted: boolean;
  bpm: number;
  startTime: number;
  effects: string[];
  tetheredMetadata?: TetheredMetadata;
  pluckBaseNote: boolean;
  audioContext: AudioContext;
  currentInstrument: Soundfont.Player | null;
  masterVolumeGainNode: GainNode;
  currentlyPlayingStrings: (
    Soundfont.Player | AudioBufferSourceNode | undefined
  )[];
  acousticSteelOverrideForPreview?: Soundfont.Player;
  scheduledNodes?: StoppablePlaybackNode[];
}

function playNote({
  tuning,
  stringIdx,
  fret,
  fretted,
  bpm,
  startTime,
  effects,
  tetheredMetadata,
  pluckBaseNote,
  audioContext,
  currentInstrument,
  masterVolumeGainNode,
  currentlyPlayingStrings,
  acousticSteelOverrideForPreview,
  scheduledNodes,
}: PlayNote) {
  const instrument = acousticSteelOverrideForPreview ?? currentInstrument;
  if (!instrument) return;
  playGuitarNote({
    instrument,
    midi: tuning[stringIdx]! + fret,
    fret,
    fretted,
    stringIdx,
    bpm,
    startTime,
    effects,
    transition: tetheredMetadata,
    pluckBaseNote,
    audioContext,
    destination: masterVolumeGainNode,
    strings: currentlyPlayingStrings,
    scheduledNodes,
  });
}

function columnHasNoNotes(column: string[]) {
  for (let i = 1; i < 7; i++) {
    if (column[i] !== "") return false;
  }

  return true;
}

function countSoundedStrumNotes(currColumn: string[]): number {
  let count = 0;
  for (let index = 1; index < 7; index++) {
    const note = currColumn[index];
    if (!note) continue;
    // Notes that are only tethered effect letters are skipped in the play loop
    if (
      note === "h" ||
      note === "p" ||
      note === "/" ||
      note === "\\" ||
      note === "r"
    ) {
      continue;
    }
    count++;
  }
  return count;
}

function resolveChordDelayMultiplier({
  currColumn,
  bpm,
  forTuningPreview,
}: {
  currColumn: string[];
  bpm: number;
  forTuningPreview?: boolean;
}): number {
  const effects = currColumn[7] ?? "";
  if (!effects.includes("v") && !effects.includes("^")) {
    return 0;
  }

  if (forTuningPreview) {
    return TUNING_PREVIEW_NOTE_DELAY_SECONDS;
  }

  const compiledSpread = parseCompiledStrumSpread(currColumn[10]);
  const arpeggiated = effects.includes("~");
  const strumQuickly = effects.includes(">") || effects.includes(".");

  let totalSpreadSeconds: number;
  if (compiledSpread.mode === "manual") {
    totalSpreadSeconds = remapStrumSpreadForType(
      compiledSpread.seconds,
      arpeggiated,
    );
  } else {
    // "auto" or missing slot (legacy compiled columns)
    totalSpreadSeconds = calculateAutomaticStrumSpreadSeconds(
      bpm,
      arpeggiated,
      strumQuickly,
    );
  }

  const soundedNotes = countSoundedStrumNotes(currColumn);
  if (soundedNotes <= 1) return 0;
  return totalSpreadSeconds / (soundedNotes - 1);
}

interface PlayNoteColumn {
  tuning: number[];
  capo: number;
  bpm: number;
  targetStartTime?: number;
  thirdPrevColumn?: string[];
  secondPrevColumn?: string[];
  prevColumn?: string[];
  currColumn: string[];
  nextColumn?: string[];
  audioContext: AudioContext;
  masterVolumeGainNode: GainNode;
  currentInstrument: Soundfont.Player | null;
  currentlyPlayingStrings: (
    Soundfont.Player | AudioBufferSourceNode | undefined
  )[];
  acousticSteelOverrideForPreview?: Soundfont.Player;
  forTuningPreview?: boolean;
  scheduledNodes?: StoppablePlaybackNode[];
  isSessionValid?: () => boolean;
  onNoteStart?: (stringIndex: number) => void;
}

function playNoteColumn({
  tuning,
  capo,
  bpm,
  targetStartTime,
  thirdPrevColumn,
  secondPrevColumn,
  prevColumn,
  currColumn,
  nextColumn,
  audioContext,
  masterVolumeGainNode,
  currentInstrument,
  currentlyPlayingStrings,
  acousticSteelOverrideForPreview,
  forTuningPreview,
  scheduledNodes,
  isSessionValid,
  onNoteStart,
}: PlayNoteColumn) {
  return new Promise<void>((resolve) => {
    const chordDuration = 60 / bpm;
    const scheduledStartTime = targetStartTime ?? audioContext.currentTime;
    const scheduledEndTime =
      scheduledStartTime +
      (forTuningPreview
        ? countSoundedStrumNotes(currColumn) * TUNING_PREVIEW_NOTE_DELAY_SECONDS
        : chordDuration);
    const secondsUntilScheduledEnd =
      scheduledEndTime - audioContext.currentTime;

    const resolveDelayMs = Math.max(0, secondsUntilScheduledEnd * 1000);

    setTimeout(() => {
      resolve();
    }, resolveDelayMs);

    // I think it's better to group "r" and "s" here
    // because I don't think you want to be super aggresive on deleting the prev
    // notes if they exist in column ux wise if someone were to add an "s" to [7]
    // while editing
    if (
      columnHasNoNotes(currColumn) ||
      currColumn[7]?.includes("s") ||
      currColumn[7] === "r"
    ) {
      if (currColumn[7]?.includes("s")) {
        const instrument = acousticSteelOverrideForPreview ?? currentInstrument;
        if (instrument)
          playGuitarPercussion({
            instrument,
            kind: "slap",
            midi: tuning[5]! + capo,
            stringIdx: 5,
            accented: currColumn[7].includes(">"),
            staccato: currColumn[7].includes("."),
            palmMuted: Boolean(currColumn[0]),
            startTime: scheduledStartTime,
            audioContext,
            destination: masterVolumeGainNode,
            strings: currentlyPlayingStrings,
            scheduledNodes,
          });
      } else if (currColumn[7] === "r") {
        stopGuitarStrings(currentlyPlayingStrings, scheduledStartTime);
      }
      return;
    }

    let notesPlayedSoFar = 0;
    let chordDelayMultiplier = 0;

    if (currColumn[7]?.includes("v") || currColumn[7]?.includes("^")) {
      chordDelayMultiplier = resolveChordDelayMultiplier({
        currColumn,
        bpm,
        forTuningPreview,
      });
    }

    const allInlineEffects = /[hp\/\\\\br~>.x]/g;
    const tetherEffects = /^[hp\/\\\\]$/;
    const onlyHasFretNumber = /^[0-9]+$/;
    const containsNumber = /\d/;

    for (let index = 1; index < 7; index++) {
      // 1-6 is actually starting with "high e" normally, so reverse it if you want
      // to start with "low e" aka downwards strum
      const stringIdx = currColumn[7]?.includes("v") ? 7 - index : index;
      const adjustedStringIdx = stringIdx - 1; // adjusting for 0-indexing

      if (currColumn[stringIdx]?.startsWith("x")) {
        const instrument = acousticSteelOverrideForPreview ?? currentInstrument;
        if (instrument)
          playGuitarPercussion({
            instrument,
            kind: "dead",
            midi: tuning[adjustedStringIdx]! + capo,
            stringIdx: adjustedStringIdx,
            accented: Boolean(
              currColumn[7]?.includes(">") ||
              currColumn[stringIdx]?.includes(">"),
            ),
            staccato: currColumn[stringIdx]?.includes("."),
            palmMuted: Boolean(currColumn[0]),
            startTime:
              scheduledStartTime + chordDelayMultiplier * notesPlayedSoFar,
            audioContext,
            destination: masterVolumeGainNode,
            strings: currentlyPlayingStrings,
            scheduledNodes,
          });
        notesPlayedSoFar++;
        continue;
      }

      const thirdPrevNote = thirdPrevColumn?.[stringIdx];
      const secondPrevNote = secondPrevColumn?.[stringIdx];
      const prevNote = prevColumn?.[stringIdx];
      const currNote = currColumn[stringIdx];
      const nextNote = nextColumn?.[stringIdx];

      const prevNoteHadTetherEffect =
        prevNote && tetherEffects.test(prevNote.at(-1) || "");

      const currNoteEffects = currNote ? currNote.match(allInlineEffects) : [];

      if (
        !currNote ||
        // skipping effects because next note is the one that actually gets played
        // in a "3 {effect} 5" scenario
        currNote === "h" ||
        currNote === "p" ||
        currNote === "/" ||
        currNote === "\\" ||
        // don't want to pluck note that is the target frequency of the bend
        (prevNote?.includes("b") && onlyHasFretNumber.test(currNote || "")) ||
        // don't want to play a "release" effect if there is no bend to release
        // from w/in last 2 columns
        (currNote === "r" &&
          !prevNote?.includes("b") &&
          !secondPrevNote?.includes("b"))
      )
        continue;

      let fret = extractNumber(currNote) + capo;

      let tetheredMetadata: TetheredMetadata | undefined = undefined;

      let transitionFromFret = undefined;
      let transitionToFret = undefined;
      let pluckBaseNote = true;
      let effect:
        "h" | "p" | "/" | "\\" | "b" | "r" | "arbitrarySlide" | undefined =
        undefined;

      const lastBend = [prevNote, secondPrevNote, thirdPrevNote].find((note) =>
        note?.includes("b"),
      );

      if (currNote?.includes("b")) {
        transitionToFret =
          nextNote && containsNumber.test(nextNote)
            ? extractNumber(nextNote) + capo
            : Math.min(22, extractNumber(currNote) + 2) + capo;
        effect = "b";
        pluckBaseNote =
          !prevNote?.includes("r") ||
          !lastBend ||
          extractNumber(currNote) !== extractNumber(lastBend);
      } else if (currNote?.includes("r")) {
        effect = "r";
        pluckBaseNote = false;
        if (currNote === "r" && lastBend) {
          // In 3b 5 r, the numeric column is the held bend target. In 3b r,
          // infer the whole-step target used when scheduling the bend.
          fret =
            secondPrevNote?.includes("b") &&
            prevNote &&
            containsNumber.test(prevNote)
              ? extractNumber(prevNote) + capo
              : Math.min(22, extractNumber(lastBend) + 2) + capo;
        }
        transitionToFret = lastBend
          ? extractNumber(lastBend) + capo
          : Math.max(0, extractNumber(currNote) - 2) + capo;
      }

      if (
        secondPrevNote &&
        (prevNote === "/" ||
          prevNote === "\\" ||
          prevNote === "h" ||
          prevNote === "p")
      ) {
        transitionFromFret = extractNumber(secondPrevNote) + capo;
        effect = prevNote;
      }

      // pre-note arbitrary slide up/down
      else if (currNote.startsWith("/") || currNote.startsWith("\\")) {
        if (currNote.startsWith("/")) {
          let baseFret = extractNumber(currNote);

          if (baseFret <= 2) {
            baseFret = 0;
          } else {
            baseFret -= 2;
          }

          fret = baseFret + capo;
        } else {
          let baseFret = extractNumber(currNote);

          if (baseFret >= 20) {
            baseFret = 22;
          } else {
            baseFret += 2;
          }

          fret = baseFret + capo;
        }

        transitionToFret = extractNumber(currNote) + capo;
        effect = "arbitrarySlide";
      }

      // post-note arbitrary slide up
      else if (currNote?.at(-1) === "/" && !nextNote) {
        let baseFret = extractNumber(currNote);

        if (baseFret >= 20) {
          baseFret = 22;
        } else {
          baseFret += 2;
        }

        transitionToFret = baseFret + capo;
        effect = "arbitrarySlide";
      }
      // post-note arbitrary slide down
      else if (currNote?.at(-1) === "\\" && !nextNote) {
        let baseFret = extractNumber(currNote);

        if (baseFret <= 2) {
          baseFret = 0;
        } else {
          baseFret -= 2;
        }

        transitionToFret = baseFret + capo;
        effect = "arbitrarySlide";
      }

      // handling hp/\ tethered effects
      else if (prevNote && prevNoteHadTetherEffect) {
        transitionFromFret = extractNumber(prevNote) + capo;
        effect = prevNote.at(-1)! as "h" | "p" | "/" | "\\";
      }

      if (effect) {
        tetheredMetadata = {
          effect,
          pluckBaseNote,
          transitionFromFret,
          transitionToFret,
        };
      }

      const effects = [...(currColumn[0] ? ["PM"] : [])];

      if (currNoteEffects) {
        currNoteEffects.forEach((effect) => {
          effects.push(effect);
        });
      }

      if (currColumn[7] !== "") {
        // Chord-effect `~` is arpeggio (spread), not vibrato. Vibrato `~` only
        // comes from the fret note via currNoteEffects above.
        chordEffectCharsForNoteAudio(currColumn[7]!).forEach((effect) => {
          effects.push(effect);
        });
      }

      // Vibrato can continue a held bend without another pick attack.
      if (!currNote?.includes("b") && !currNote?.includes("r")) {
        pluckBaseNote = !(
          currNote?.includes("~") &&
          (prevNote?.includes("b") ||
            (secondPrevNote?.includes("b") &&
              prevNote &&
              onlyHasFretNumber.test(prevNote)))
        );
      }

      playNote({
        tuning,
        stringIdx: adjustedStringIdx,
        fret,
        fretted:
          (effect === "arbitrarySlide" ? (transitionToFret ?? fret) : fret) >
          capo,
        bpm,
        startTime: scheduledStartTime + chordDelayMultiplier * notesPlayedSoFar,
        effects,
        tetheredMetadata,
        pluckBaseNote,
        audioContext,
        currentInstrument,
        masterVolumeGainNode,
        currentlyPlayingStrings,
        acousticSteelOverrideForPreview,
        scheduledNodes,
      });

      if (onNoteStart) {
        const delayMs = Math.max(
          0,
          (scheduledStartTime +
            chordDelayMultiplier * notesPlayedSoFar -
            audioContext.currentTime) *
            1000,
        );

        setTimeout(() => {
          if (!isSessionValid || isSessionValid()) {
            onNoteStart(adjustedStringIdx);
          }
        }, delayMs);
      }

      notesPlayedSoFar++;
    }
  });
}

export { playNoteColumn };
