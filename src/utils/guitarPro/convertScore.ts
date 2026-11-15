import { model } from "@coderline/alphatab/core";
import { midiToNoteName } from "@tonaljs/midi";
import type {
  FullNoteLengths,
  Section,
  TabNote,
  TabSection,
} from "../../stores/TabStore";
import { noteLengthMultipliers } from "../noteLengthMultipliers";
import { tabDocumentSchema } from "../tabDocument";
import type { ImportPreview, ImportTrack } from "./types";

const MAX_MEASURES = 4000;
const MAX_COLUMNS = 30000;
// alphaTab numbers strings low-to-high. Autostrum stores note rows top-to-bottom
// (firstString is high E), although its tuning metadata is still low-to-high.
const stringKeys = [
  "sixthString",
  "fifthString",
  "fourthString",
  "thirdString",
  "secondString",
  "firstString",
] as const;
const lengths = Object.entries(noteLengthMultipliers) as [
  FullNoteLengths,
  number,
][];

export function getImportTracks(score: model.Score): ImportTrack[] {
  return score.tracks.flatMap((track, trackIndex) =>
    track.staves.flatMap((staff, staffIndex) =>
      !staff.isPercussion &&
      staff.tuning.length > 0 &&
      staff.bars.some((bar) =>
        bar.voices.some((voice) =>
          voice.beats.some((beat) => beat.notes.length > 0),
        ),
      )
        ? [
            {
              id: `${trackIndex}:${staffIndex}`,
              name: `${track.name || `Track ${trackIndex + 1}`}${track.staves.length > 1 ? ` · Staff ${staffIndex + 1}` : ""}`,
              strings: staff.tuning.length,
              measures: staff.bars.length,
            },
          ]
        : [],
    ),
  );
}

/** Unroll repeats and alternate endings into editable measures, with a hard work limit. */
export function getMeasureOrder(bars: model.MasterBar[]): number[] {
  const result: number[] = [];
  const stack: {
    group: model.RepeatGroup;
    start: number;
    pass: number;
    endings: number;
    hasEndings: boolean;
    iterations: number[];
  }[] = [];
  let visits = 0;
  for (let index = 0; index < bars.length;) {
    if (++visits > MAX_MEASURES * 8 || result.length >= MAX_MEASURES)
      throw new Error(
        "This score expands to too many measures. Export a shorter selection and try again.",
      );
    const bar = bars[index]!;
    const group = bar.repeatGroup;
    if (
      group.isClosed &&
      group.opening === bar &&
      !stack.some((repeat) => repeat.group === group)
    )
      stack.push({
        group,
        start: index,
        pass: 0,
        endings: 0,
        hasEndings: group.masterBars.some(
          (item) => item.alternateEndings !== 0,
        ),
        iterations: group.closings.map(() => 0),
      });
    const repeat = stack.at(-1);
    if (repeat && bar.alternateEndings) repeat.endings = bar.alternateEndings;
    const played =
      !repeat?.endings || Boolean(repeat.endings & (1 << repeat.pass));
    if (played) result.push(index);
    if (bar.repeatCount > 1) {
      if (!repeat) {
        index++;
        continue;
      }
      const closingIndex = repeat.group.closings.indexOf(bar);
      const lastClosing = closingIndex === repeat.group.closings.length - 1;
      if (repeat.hasEndings && !played && !lastClosing) {
        index++;
        continue;
      }
      const iteration = repeat.hasEndings
        ? repeat.pass
        : (repeat.iterations[closingIndex] ?? 0);
      if (iteration < bar.repeatCount - 1) {
        if (repeat.hasEndings) repeat.pass++;
        else {
          repeat.iterations[closingIndex] = iteration + 1;
          repeat.iterations.fill(0, 0, closingIndex);
        }
        repeat.endings = 0;
        index = repeat.start;
        continue;
      }
      if (lastClosing) stack.pop();
    }
    index++;
  }
  return result;
}

function nearestLength(ticks: number, warnings: Set<string>): FullNoteLengths {
  const quarters = ticks / 960;
  let best = lengths[0]!;
  for (const length of lengths)
    if (Math.abs(length[1] - quarters) < Math.abs(best[1] - quarters))
      best = length;
  if (Math.abs(best[1] - quarters) > 0.001)
    warnings.add(
      "Tuplets and durations outside whole–sixteenth notes are rounded to the nearest supported rhythm. Timing may change.",
    );
  return best[0];
}

function safeTempo(value: number, warnings: Set<string>) {
  const tempo = Number.isFinite(value) && value > 0 ? Math.round(value) : 120;
  const clamped = Math.max(1, Math.min(400, tempo));
  if (clamped !== value)
    warnings.add("Tempos are rounded to whole BPM and limited to 1–400 BPM.");
  return clamped;
}

function noteText(
  note: model.Note,
  warnings: Set<string>,
  nextStart: number,
): string {
  if (note.isDead) return "x";
  if (note.isHarmonic)
    warnings.add("Harmonics use ordinary fretted notes at the written fret.");
  if (note.isTieDestination)
    warnings.add(
      "Tied notes are picked again; independent voice sustains are shortened at the next column.",
    );
  if (note.isGhost || note.dynamics !== model.DynamicValue.F)
    warnings.add(
      "Ghost-note volume and dynamics use the editor’s standard volume; accents are kept.",
    );
  if (note.isTrill)
    warnings.add("Trills use the main fretted note without alternation.");
  if (note.hasBend)
    warnings.add("Bend and release curves use vibrato at the written fret.");
  let effect = "";
  // Only retain transitions to the next imported onset. Otherwise an unrelated note could
  // become the transition target in Autostrum's column-based playback.
  const isAdjacent = (target: model.Note | null) =>
    target?.beat.voice.bar === note.beat.voice.bar &&
    target.beat.displayStart === nextStart &&
    target.string === note.string;
  if (isAdjacent(note.hammerPullDestination))
    effect = note.hammerPullDestination!.fret > note.fret ? "h" : "p";
  else if (isAdjacent(note.slideTarget))
    effect = note.slideTarget!.fret > note.fret ? "/" : "\\";
  else if (note.slideOutType === model.SlideOutType.OutUp) effect = "/";
  else if (note.slideOutType === model.SlideOutType.OutDown) effect = "\\";
  else if (note.vibrato !== model.VibratoType.None || note.hasBend)
    effect = "~";
  else if (note.accentuated !== model.AccentuationType.None) effect = ">";
  else if (note.isStaccato) effect = ".";
  if (
    (note.isHammerPullOrigin && !isAdjacent(note.hammerPullDestination)) ||
    (note.slideTarget && !isAdjacent(note.slideTarget))
  )
    warnings.add(
      "Transitions across measures or intervening voice onsets use ordinary picked notes.",
    );
  if (
    note.slideInType !== model.SlideInType.None ||
    note.slideOutType >= model.SlideOutType.PickSlideDown
  )
    warnings.add(
      "Slide-ins and pick slides use ordinary fretted notes; slides between adjacent notes are kept.",
    );
  if (
    [
      note.isHammerPullOrigin || note.slideOutType !== model.SlideOutType.None,
      note.hasBend || note.vibrato !== model.VibratoType.None,
      note.isStaccato,
      note.accentuated !== model.AccentuationType.None,
    ].filter(Boolean).length > 1
  )
    warnings.add(
      "When a note has several effects, one is kept: a transition, vibrato, accent, then staccato.",
    );
  return `${note.fret}${effect}`;
}

function blankNote(noteLength: FullNoteLengths): TabNote {
  return {
    id: crypto.randomUUID(),
    type: "note",
    palmMute: "",
    firstString: "",
    secondString: "",
    thirdString: "",
    fourthString: "",
    fifthString: "",
    sixthString: "",
    chordEffects: "",
    noteLength,
    strumSpreadAuto: false,
    strumSpreadSeconds: 0,
  };
}

export function convertScore(
  score: model.Score,
  trackId: string,
  fileName: string,
): ImportPreview {
  if (!getImportTracks(score).some((track) => track.id === trackId))
    throw new Error("Choose a fretted instrument track to import.");
  const [trackIndex, staffIndex] = trackId.split(":").map(Number);
  const staff = score.tracks[trackIndex!]!.staves[staffIndex!]!;
  const warnings = new Set<string>();
  if (getImportTracks(score).length > 1)
    warnings.add(
      "Only the selected track and staff are imported; other instruments are left out.",
    );
  const sourceTuning = [...staff.tuning]
    .reverse()
    .map((pitch) => pitch + staff.transpositionPitch);
  const padding = Math.max(0, 6 - sourceTuning.length);
  const omitted = Math.max(0, sourceTuning.length - 6);
  const tuning = sourceTuning.slice(omitted);
  while (tuning.length < 6) tuning.unshift(tuning[0]! - 5);
  if (sourceTuning.length !== 6)
    warnings.add(
      sourceTuning.length < 6
        ? "This instrument is placed on six strings with unused lower strings added. Its original tuning and fret positions are kept."
        : "The highest six strings are kept. Lower-string notes are moved to available strings at the same pitch when possible; unplayable notes are omitted.",
    );
  if (
    tuning.some(
      (pitch) => !Number.isInteger(pitch) || pitch < 12 || pitch > 119,
    )
  )
    throw new Error(
      "This track’s tuning is outside the editor’s supported pitch range. Try another track.",
    );
  const capo = Math.max(0, Math.min(22, Math.round(staff.capo)));
  if (capo !== staff.capo) warnings.add("The capo is limited to frets 0–22.");
  const initialTempo = safeTempo(score.tempo, warnings);
  // Calculate the written tempo at every measure so a repeat restores it.
  let tempo = initialTempo;
  const measureTempos = score.masterBars.map((bar) => {
    const start = bar.tempoAutomations.find(
      (automation) => automation.ratioPosition === 0,
    );
    if (start) tempo = safeTempo(start.value, warnings);
    const atStart = tempo;
    for (const automation of bar.tempoAutomations)
      tempo = safeTempo(automation.value, warnings);
    return atStart;
  });
  const order = getMeasureOrder(score.masterBars);
  if (
    order.length !== score.masterBars.length ||
    score.masterBars.some((bar) => bar.isRepeatStart || bar.repeatCount > 1)
  )
    warnings.add(
      "Repeats and alternate endings are expanded into editable measures in playing order.",
    );
  if (score.masterBars.some((bar) => bar.directions?.size))
    warnings.add(
      "Da capo, dal segno, coda and fine navigation is omitted. Measures follow written order with bar repeats expanded.",
    );
  if (
    score.masterBars.some(
      (bar) => bar.tripletFeel !== model.TripletFeel.NoTripletFeel,
    )
  )
    warnings.add("Swing and shuffle feel use straight timing.");
  if (score.masterBars.some((bar) => bar.fermata?.size))
    warnings.add("Fermatas use the written duration without an extra pause.");
  if (
    staff.bars.some(
      (bar) => bar.voices.filter((voice) => !voice.isEmpty).length > 1,
    )
  )
    warnings.add(
      "Voices are combined at their note onsets. Independent sustains are shortened; conflicting notes on one string keep the first voice.",
    );

  const sections: Section[] = [];
  let currentSection: Section | undefined;
  let columnCount = 0;
  let hasNotes = false;
  let lastWrittenIndex = -1;
  for (const barIndex of order) {
    const master = score.masterBars[barIndex]!;
    const bar = staff.bars[barIndex];
    if (
      !currentSection ||
      master.section ||
      barIndex !== lastWrittenIndex + 1
    ) {
      currentSection = {
        id: crypto.randomUUID(),
        title: (
          master.section?.text ||
          master.section?.marker ||
          `Section ${sections.length + 1}`
        ).slice(0, 50),
        data: [],
      };
      sections.push(currentSection);
    }
    lastWrittenIndex = barIndex;
    let subSection = currentSection.data.at(-1) as TabSection | undefined;
    // Bound subsection size for editing and split at tempo changes.
    const barTempo = measureTempos[barIndex]!;
    if (subSection?.bpm !== barTempo || subSection.data.length >= 256) {
      subSection = {
        id: crypto.randomUUID(),
        type: "tab",
        bpm: barTempo,
        baseNoteLength: "quarter",
        repetitions: 1,
        data: [],
      };
      currentSection.data.push(subSection);
    } else {
      subSection.data.push({
        id: crypto.randomUUID(),
        type: "measureLine",
        isInPalmMuteSection: false,
        bpmAfterLine: barTempo,
      });
    }
    const events = new Map<number, model.Beat[]>();
    const duration = master.calculateDuration();
    for (const voice of bar?.voices ?? []) {
      for (const beat of voice.beats) {
        if (beat.graceType !== model.GraceType.None) {
          warnings.add(
            "Grace notes are omitted so the main rhythm is preserved.",
          );
          continue;
        }
        if (
          beat.isEmpty ||
          beat.displayStart < 0 ||
          beat.displayStart >= duration
        )
          continue;
        const at = events.get(beat.displayStart) ?? [];
        at.push(beat);
        events.set(beat.displayStart, at);
        const end = beat.displayStart + beat.displayDuration;
        if (end < duration && !events.has(end)) events.set(end, []);
      }
    }
    if (!events.has(0)) events.set(0, []);
    const starts = [...events.keys()].sort((a, b) => a - b);
    const automations = [...master.tempoAutomations].sort(
      (a, b) => a.ratioPosition - b.ratioPosition,
    );
    let automationIndex = 0;
    let currentTempo = barTempo;
    for (let index = 0; index < starts.length; index++) {
      const start = starts[index]!;
      const beats = events.get(start)!;
      while (
        automations[automationIndex] &&
        automations[automationIndex]!.ratioPosition * duration <= start
      ) {
        const automation = automations[automationIndex++]!;
        const nextTempo = safeTempo(automation.value, warnings);
        if (automation.isLinear)
          warnings.add("Gradual tempo ramps use stepped tempo changes.");
        if (nextTempo !== currentTempo) {
          subSection.data.push({
            id: crypto.randomUUID(),
            type: "measureLine",
            isInPalmMuteSection: false,
            bpmAfterLine: nextTempo,
          });
          currentTempo = nextTempo;
        }
      }
      if (automations.some((automation) => automation.ratioPosition > 0))
        warnings.add(
          "Tempo changes inside measures are moved to the next note boundary and shown with a measure line.",
        );
      const ticks = (starts[index + 1] ?? duration) - start;
      if (ticks <= 0) continue;
      const column = blankNote(nearestLength(ticks, warnings));
      const occupied = new Set<number>();
      const notes = beats.flatMap((beat) => beat.notes);
      // Reserve original playable strings before revoicing extra strings.
      notes.sort(
        (a, b) =>
          Number(a.string <= omitted || a.fret > 22) -
          Number(b.string <= omitted || b.fret > 22),
      );
      for (const note of notes) {
        let stringIndex = note.string - 1 - omitted + padding;
        let fret = note.fret;
        const originalString = stringIndex;
        if (stringIndex < 0 || stringIndex >= 6 || fret < 0 || fret > 22) {
          const pitch = sourceTuning[note.string - 1]! + note.fret;
          stringIndex = tuning.findIndex(
            (open, candidate) =>
              !occupied.has(candidate) &&
              pitch - open >= 0 &&
              pitch - open <= 22,
          );
          fret = pitch - tuning[stringIndex]!;
          warnings.add(
            "Frets outside 0–22 and extra-string notes are moved to another string at the same pitch where possible; unplayable notes are omitted.",
          );
        }
        if (
          stringIndex < 0 ||
          !Number.isInteger(fret) ||
          occupied.has(stringIndex)
        )
          continue;
        occupied.add(stringIndex);
        let value = noteText(note, warnings, starts[index + 1] ?? duration);
        if (stringIndex !== originalString || fret !== note.fret)
          value = note.isDead ? "x" : `${fret}`;
        column[stringKeys[stringIndex]!] = value;
        hasNotes = true;
      }
      const sounding = notes;
      if (sounding.some((note) => note.isPalmMute)) {
        column.palmMute = "start";
        if (!sounding.every((note) => note.isPalmMute))
          warnings.add(
            "Partial palm muting is applied to the entire note column.",
          );
      }
      for (const beat of beats) {
        if (beat.isLetRing)
          warnings.add("Let-ring notes use the editor’s normal sustain.");
        if (beat.brushType !== model.BrushType.None) {
          const down =
            beat.brushType === model.BrushType.BrushDown ||
            beat.brushType === model.BrushType.ArpeggioDown;
          column.chordEffects = down ? "v" : "^";
          if (
            beat.brushType === model.BrushType.ArpeggioDown ||
            beat.brushType === model.BrushType.ArpeggioUp
          )
            column.chordEffects += "~";
          column.strumSpreadAuto = true;
          warnings.add(
            "Brush and arpeggio directions use Autostrum’s automatic strum timing.",
          );
        }
        if (beat.vibrato !== model.VibratoType.None || beat.hasWhammyBar) {
          for (const key of stringKeys)
            if (/^\d+$/.test(column[key])) column[key] += "~";
          if (beat.hasWhammyBar)
            warnings.add("Whammy-bar curves use vibrato on the fretted notes.");
        }
        if (
          beat.isTremolo ||
          beat.fade ||
          beat.crescendo ||
          beat.tap ||
          beat.slap ||
          beat.pop ||
          beat.hasRasgueado ||
          beat.wahPedal
        )
          warnings.add(
            "Tremolo picking, fades, crescendos, tapping, slap/pop, rasgueado and pedal effects use ordinary picked notes.",
          );
      }
      if (stringKeys.every((key) => !column[key])) column.chordEffects = "r";
      subSection.data.push(column);
      if (++columnCount > MAX_COLUMNS)
        throw new Error(
          "This track has too many notes to import at once. Export a shorter selection and try again.",
        );
    }
  }
  if (!hasNotes)
    throw new Error(
      "No playable notes remain on this track. Try another fretted instrument track.",
    );
  // Close every palm-mute run so imports never open a pending editor gesture.
  for (const section of sections) {
    for (const subSection of section.data) {
      if (subSection.type !== "tab") continue;
      let run: TabNote[] = [];
      const finishRun = () => {
        run.forEach((note, index) => {
          note.palmMute =
            run.length === 1
              ? "-"
              : index === 0
                ? "start"
                : index === run.length - 1
                  ? "end"
                  : "-";
        });
        run = [];
      };
      for (const column of subSection.data) {
        if (column.type === "measureLine") continue;
        if (column.palmMute) run.push(column);
        else finishRun();
      }
      finishRun();
      let muted = false;
      for (const column of subSection.data) {
        if (column.type === "measureLine") column.isInPalmMuteSection = muted;
        else if (column.palmMute === "start") muted = true;
        else if (column.palmMute === "end") muted = false;
      }
    }
  }
  const title = (score.title.trim() || fileName.replace(/\.[^.]+$/, "")).slice(
    0,
    50,
  );
  const description = [score.album && `Album: ${score.album}`, score.notices]
    .filter(Boolean)
    .join("\n");
  if (score.title.length > 50 || description.length > 500)
    warnings.add(
      "Long titles and descriptions are shortened to fit the editor.",
    );
  const artistName = score.artist.trim().slice(0, 60) || undefined;
  if (score.artist.trim().length > 60)
    warnings.add("The artist’s name is shortened to fit the editor.");
  warnings.add(
    "Time/key signatures, lyrics, chord diagrams, fingering, sound presets and mixing settings are not imported. Choose a genre and review the tab before publishing.",
  );
  const document = tabDocumentSchema.parse({
    title,
    artistId: null,
    artistName,
    artistIsVerified: false,
    description: description.slice(0, 500) || null,
    genre: "",
    tuning: tuning
      .map((pitch) => midiToNoteName(pitch, { sharps: true }).toLowerCase())
      .join(" "),
    bpm: initialTempo,
    capo,
    key: null,
    difficulty: 1,
    chords: [],
    strummingPatterns: [],
    sectionProgression: [],
    tabData: sections,
  });
  return { document, warnings: [...warnings], measures: order.length };
}
