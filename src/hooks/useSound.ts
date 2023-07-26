import { useState, useEffect, useRef } from "react";
import Soundfont from "soundfont-player";
import { parse } from "react-guitar-tunings";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import type {
  SectionProgression,
  Section,
  TabSection,
  ChordSection,
  ChordSequence,
  StrummingPattern,
  Chord,
  Metadata,
} from "../stores/TabStore";
import getRepetitions from "~/utils/getRepetitions";
import getBpmForChord from "~/utils/getBpmForChord";

export default function useSound() {
  const {
    showingAudioControls,
    setShowingAudioControls,
    currentlyPlayingMetadata,
    setCurrentlyPlayingMetadata,
    currentInstrumentName,
    setCurrentInstrumentName,
    playbackSpeed,
    setPlaybackSpeed,
    volume,
    setVolume,
    currentChordIndex,
    setCurrentChordIndex,
    playingAudio,
    setPlayingAudio,
    instruments,
    setInstruments,
    currentInstrument,
    setCurrentInstrument,
  } = useTabStore(
    (state) => ({
      showingAudioControls: state.showingAudioControls,
      setShowingAudioControls: state.setShowingAudioControls,
      currentlyPlayingMetadata: state.currentlyPlayingMetadata,
      setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
      currentInstrumentName: state.currentInstrumentName,
      setCurrentInstrumentName: state.setCurrentInstrumentName,
      playbackSpeed: state.playbackSpeed,
      setPlaybackSpeed: state.setPlaybackSpeed,
      volume: state.volume,
      setVolume: state.setVolume,
      currentChordIndex: state.currentChordIndex,
      setCurrentChordIndex: state.setCurrentChordIndex,
      playingAudio: state.playingAudio,
      setPlayingAudio: state.setPlayingAudio,
      instruments: state.instruments,
      setInstruments: state.setInstruments,
      currentInstrument: state.currentInstrument,
      setCurrentInstrument: state.setCurrentInstrument,
    }),
    shallow
  );

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const breakOnNextNote = useRef(false);

  // const masterVolumeGainNode = useRef<GainNode | null>(null);
  // const volumeRef = useRef(50);

  useEffect(() => {
    const newAudioContext = new AudioContext();
    setAudioContext(newAudioContext);

    // masterVolumeGainNode.current = newAudioContext.createGain();
    // return () => { not even entirely sure if this is necessary since it will only be unmounted when
    // leaving the whole site
    //   void audioContext.close();
    // };
  }, []);

  const currentNoteArrayRef = useRef<
    (Soundfont.Player | AudioBufferSourceNode | undefined)[]
  >([undefined, undefined, undefined, undefined, undefined, undefined]);

  useEffect(() => {
    const fetchInstrument = async () => {
      if (!audioContext) return;

      // Check if the instrument is already in cache
      if (instruments[currentInstrumentName]) {
        setCurrentInstrument(instruments[currentInstrumentName]);
        return;
      }

      setCurrentInstrument(null);

      // If not in cache, fetch it
      const guitarObj = await Soundfont.instrument(
        audioContext,
        currentInstrumentName,
        {
          soundfont: "MusyngKite",
          format: "ogg",
        }
      );

      // Update the cache
      const updatedInstruments = {
        ...instruments,
        [currentInstrumentName]: guitarObj,
      };
      setInstruments(updatedInstruments);

      // Set the current instrument
      setCurrentInstrument(guitarObj);
    };

    void fetchInstrument();
  }, [
    audioContext,
    currentInstrumentName,
    instruments,
    setCurrentInstrument,
    setInstruments,
  ]);

  // useEffect(() => {
  //   console.log("got new volume", volume);

  //   volumeRef.current = volume;

  //   // if (!masterVolumeGainNode.current) return;

  //   // masterVolumeGainNode.current.gain.value = volume / 100;
  // }, [volume]);

  interface PlayNoteWithEffects {
    note: GainNode;
    stringIdx: number;
    fret: number;
    bpm: number;
    when: number;
    isPalmMuted: boolean;
    inlineEffect?: string;
    prevTetheredNote?: {
      note: number;
      effect: string;
    };
  }

  function playNoteWithEffects({
    note,
    stringIdx,
    fret,
    bpm,
    when,
    isPalmMuted,
    inlineEffect,
    prevTetheredNote,
  }: PlayNoteWithEffects) {
    if (!audioContext) return;

    // once you ahve all the effects then also pass through the audioContext to this function
    // and onto them so that these functions can be exported into a /utils/ file

    let noteWithEffectApplied = undefined;

    if (prevTetheredNote) {
      noteWithEffectApplied = applyTetheredEffect({
        note,
        currentEffect: inlineEffect,
        currentFret: fret,
        tetheredEffect: prevTetheredNote.effect as "h" | "p" | "/" | "\\",
        tetheredFret: prevTetheredNote.note,
        stringIdx,
        bpm,
        when,
      });
    } else {
      // we have to reroute connect()'ing the note to these effects when there is a tetheredEffect
      // since we have to do the hacky "copy" of the note within the applyTetheredEffect function

      if (inlineEffect === "~") {
        noteWithEffectApplied = applyVibratoEffect({
          when: 0,
          note,
          bpm,
        });
      } else if (inlineEffect === "b") {
        noteWithEffectApplied = applyBendEffect({
          note,
          stringIdx,
          when,
          bpm,
        });
      } else if (inlineEffect === "x") {
        noteWithEffectApplied = applyDeadNoteEffect(note, stringIdx, fret);
      }
    }

    if (isPalmMuted) {
      noteWithEffectApplied = applyPalmMute(
        noteWithEffectApplied ?? note,
        inlineEffect
      );
    }

    if (noteWithEffectApplied) {
      // noteWithEffectApplied.connect(masterVolumeGainNode.current!);

      // okay I'm thinking there is some memory reference shenanagins going on here,
      // because completely omitting the connection to audioContext.destination still plays the same note...
      console.log(noteWithEffectApplied, note, noteWithEffectApplied === note);

      // they are!

      // would go through master volume gain node here then connect to audioContext.destination
      // testing what happens when this is commented out
      // noteWithEffectApplied.connect(audioContext.destination);
    }
  }

  interface ApplyBendEffect {
    note?: GainNode;
    copiedNote?: AudioBufferSourceNode;
    stringIdx: number;
    when: number;
    bpm: number;
  }

  function applyBendEffect({
    note,
    copiedNote,
    stringIdx,
    when,
    bpm,
  }: ApplyBendEffect) {
    if (!audioContext) return;

    if (note) {
      note.source.detune.linearRampToValueAtTime(
        stringIdx > 1 ? 100 : -100,
        audioContext.currentTime + when + (60 / bpm) * 0.5 // maybe * 0.5 or something
      );
      return note;
    } else if (copiedNote) {
      copiedNote.detune.linearRampToValueAtTime(
        stringIdx > 1 ? 100 : -100,
        audioContext.currentTime + when + (60 / bpm) * 0.5 // maybe * 0.5 or something
      );
      // increasing gain to match level set in applyTetheredEffect=
      const copiedNoteGain = audioContext.createGain();
      copiedNoteGain.gain.value = 1.5;
      copiedNote.connect(copiedNoteGain);
      return copiedNoteGain;
    }
  }

  function playSlapSound(accented: boolean) {
    if (!audioContext) return;

    // TODO: will most likely need a way to
    // okay maybe go back to adding slap as a chord effect tbh... but play it inline with regular
    // note(s), don't even bother adjusting gain or whatever at start

    // Create an OscillatorNode to simulate the slap sound
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";

    // Adjust frequency based on the string index
    oscillator.frequency.value = 90;

    // Create a buffer for noise
    const noiseBuffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate * 0.2,
      audioContext.sampleRate
    );
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < output.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // Create buffer source for noise
    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;

    // Create a GainNode to control the volume
    const gainNode = audioContext.createGain();

    // TODO: Adjust gain based on string index for more volume on lower strings
    gainNode.gain.setValueAtTime(
      accented ? 0.6 : 0.4,
      audioContext.currentTime
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.25
    );

    // Create a BiquadFilterNode for a low-pass filter
    const lowPassFilter = audioContext.createBiquadFilter();
    lowPassFilter.type = "lowpass";
    lowPassFilter.frequency.value = 1200;

    // Create a BiquadFilterNode for boosting the mid frequencies
    const midBoost = audioContext.createBiquadFilter();
    midBoost.type = "peaking";
    midBoost.frequency.value = 800; // Frequency to boost
    midBoost.gain.value = 8; // Amount of boost in dB
    midBoost.Q.value = 1; // Quality factor

    // Create a GainNode for the noise volume
    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.2, audioContext.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.25
    );

    // Connect the oscillator and noise to the gainNode
    oscillator.connect(lowPassFilter);
    noise.connect(noiseGain);
    noiseGain.connect(lowPassFilter);
    lowPassFilter.connect(midBoost);
    midBoost.connect(gainNode);

    // // Connect the gainNode to the audioContext's destination
    gainNode.connect(audioContext.destination);

    // Start the oscillator and noise now
    oscillator.start(audioContext.currentTime);
    noise.start(audioContext.currentTime);

    // Stop the oscillator and noise shortly afterward to simulate a short, percussive sound
    oscillator.stop(audioContext.currentTime + 0.25);
    noise.stop(audioContext.currentTime + 0.25);
  }

  function applyDeadNoteEffect(
    note: GainNode,
    stringIdx: number,
    fret: number
  ) {
    if (!audioContext) return;

    // Create a BiquadFilterNode to act as a low-pass filter
    const lowPassFilter = audioContext.createBiquadFilter();
    lowPassFilter.type = "lowpass";
    lowPassFilter.frequency.value = 400; // Lower this value to cut more high frequencies

    // Create a BiquadFilterNode to boost the bass frequencies
    const bassBoost = audioContext.createBiquadFilter();
    bassBoost.type = "peaking";
    bassBoost.frequency.value = 200; // Frequency to boost - around 120Hz is a typical bass frequency
    bassBoost.gain.value = 25; // Amount of boost in dB
    bassBoost.Q.value = 50; // Quality factor - lower values make the boost range broader

    // Create a GainNode to reduce volume
    const gainNode = audioContext.createGain();

    gainNode.gain.value = 50; // Reduce gain to simulate the quieter sound of palm muting

    // Connect the note to the filter, and the filter to the gain node
    note.connect(lowPassFilter);
    lowPassFilter.connect(bassBoost);
    bassBoost.connect(gainNode);

    return gainNode;
  }

  function applyPalmMute(
    note: GainNode | AudioBufferSourceNode,
    inlineEffect?: string
  ) {
    if (!audioContext) return;

    // Create a BiquadFilterNode to act as a low-pass filter
    const lowPassFilter = audioContext.createBiquadFilter();
    lowPassFilter.type = "lowpass";
    lowPassFilter.frequency.value = 800; // Lower this value to cut more high frequencies was 2000
    lowPassFilter.Q.value = 0.5; // Quality factor - lower values make the boost range broader

    // Create a BiquadFilterNode to boost the bass frequencies
    const bassBoost = audioContext.createBiquadFilter();
    bassBoost.type = "peaking";
    bassBoost.frequency.value = 120; // Frequency to boost - around 120Hz is a typical bass frequency
    bassBoost.gain.value = 20; // Amount of boost in dB
    bassBoost.Q.value = 10; // Quality factor - lower values make the boost range broader

    // Create a GainNode to reduce volume
    const gainNode = audioContext.createGain();

    // palm muting is a little quieter than normal notes
    let gainValue = 0.75;

    if (inlineEffect === ">") {
      gainValue = 0.85;
    } else if (inlineEffect === ".") {
      gainValue = 0.8;
    }

    gainNode.gain.value = gainValue;

    // Connect the note to the filter, filter to the bass boost, and the bass boost to the gain node
    note.connect(lowPassFilter);
    lowPassFilter.connect(bassBoost);
    bassBoost.connect(gainNode);

    return gainNode;
  }

  interface ApplyTetheredEffect {
    note: GainNode;
    currentFret: number;
    currentEffect?: string;
    tetheredEffect: "h" | "p" | "/" | "\\";
    tetheredFret: number;
    stringIdx: number;
    bpm: number;
    when: number;
  }

  function applyTetheredEffect({
    note,
    currentFret,
    currentEffect,
    tetheredEffect,
    tetheredFret,
    stringIdx,
    bpm,
    when,
  }: ApplyTetheredEffect) {
    if (!audioContext) return;

    // immediately stop current note because we don't ever want to hear the pluck on
    // a tethered note
    note.source.stop(0);

    const source = audioContext.createBufferSource();

    setTimeout(() => {
      if (currentNoteArrayRef.current[stringIdx]) {
        currentNoteArrayRef.current[stringIdx]?.stop();
      }

      currentNoteArrayRef.current[stringIdx] = source;
    }, when * 1000);

    source.buffer = note.source.buffer;
    source.start(0, 0.75, 2); // maybe can go closer to 0.5s to get rid of the pluck sound

    const sourceGain = audioContext.createGain();
    sourceGain.gain.exponentialRampToValueAtTime(
      1.5, // tangent: but it really feels like to me that the actual sample files are *not* all the same
      // volume. But it is honestly a bit random so I'm not sure how we would approach "fixing" it.
      audioContext.currentTime + when + 0.05 // for whatever reason was very noticible if gain was set immediately
    );
    source.connect(sourceGain);

    // immediately ramping from tetheredFret to currentFret with a duration defined by tetheredEffect
    source.detune.setValueAtTime((tetheredFret - currentFret) * 100, 0);

    let durationOfTransition = (60 / bpm) * 0.1; // was 0.2
    if (tetheredEffect === "h" || tetheredEffect === "p") {
      durationOfTransition = (60 / bpm) * 0.025; // 0.05
    }

    source.detune.linearRampToValueAtTime(
      0.001, // doesn't like it if it is exactly 0
      audioContext.currentTime + when + durationOfTransition // don't think we need the (60 / bpm) here
    );

    // if there is a currentEffect, we need to apply it to the note after the last ramp is finished
    if (currentEffect) {
      if (currentEffect === "~") {
        applyVibratoEffect({
          copiedNote: source, // will be increasing gain w/in this function to match level set above
          when: when + durationOfTransition,
          bpm,
        });
      } else if (currentEffect === "b") {
        applyBendEffect({
          copiedNote: source, // will be increasing gain w/in this function to match level set above
          when: when + durationOfTransition,
          stringIdx,
          bpm,
        });
      }
    }

    return sourceGain;
  }

  interface ApplyVibratoEffect {
    note?: GainNode;
    copiedNote?: AudioBufferSourceNode;
    when: number; // offset to start the effect
    bpm: number;
  }

  function applyVibratoEffect({
    note,
    copiedNote,
    when,
    bpm,
  }: ApplyVibratoEffect) {
    if (!audioContext) return;

    // maybe still have dynamic gain based on fret/ (stringIdx + fret)/ or even actually just the midi number
    // if it still sounds uneven

    // Create a modulation oscillator
    const vibratoOscillator = audioContext.createOscillator();
    vibratoOscillator.type = "sine";
    vibratoOscillator.frequency.value = calculateRelativeVibratoFrequency(bpm); // Speed of vibrato

    // Create a gain node to control the depth of the vibrato
    const vibratoDepth = audioContext.createGain();
    vibratoDepth.gain.value = 40; // Depth of vibrato in cents

    // Connect the modulation oscillator to the gain
    vibratoOscillator.connect(vibratoDepth);

    vibratoOscillator.start(audioContext.currentTime + when);

    if (note) {
      vibratoDepth.connect(note.source.detune);
      return note;
    } else if (copiedNote) {
      vibratoDepth.connect(copiedNote.detune);
      // increasing gain to match level set in applyTetheredEffect
      const copiedNoteGain = audioContext.createGain();
      copiedNoteGain.gain.value = 1.5;
      copiedNote.connect(copiedNoteGain);
      return copiedNoteGain;
    }
  }

  interface PlayNote {
    tuning: number[];
    stringIdx: number;
    fret: number;
    bpm: number;
    when: number;
    effects: string[];
    prevTetheredNote?: {
      note: number;
      effect: string;
    };
  }

  function playNote({
    tuning,
    stringIdx,
    fret,
    bpm,
    when,
    effects,
    prevTetheredNote,
  }: PlayNote) {
    if (!audioContext) return;

    let duration = 2;
    let gain = 1;

    const isPalmMuted = effects.includes("PM");
    const inlineEffect = effects.at(-1) !== "PM" ? effects.at(-1) : undefined;

    if (inlineEffect === ">") {
      gain = 1.75;
      duration = 2.25;
    } else if (inlineEffect === ".") {
      gain = 1.15;
      duration = 0.25;
    }
    // dead note and palm mute effects require us to basically hijack the note by almost muting it
    // and then creating a copy of it with a delay node, and adjusting the volume/effect from there
    else if (inlineEffect === "x") {
      // pretty sure leaving PM out of this is fine because it is at the end
      // of the filter connect chain so every note before should have it's gain to w/e value it is supposed
      // to be at already coming into applyPalmMute()
      gain = 0.01;
    }

    if (isPalmMuted) {
      duration = 0.45;
    }

    if (inlineEffect === "x") {
      duration = 0.35; // play around with this value
    }

    // looks like the actual instrument() can take in a gain value, but not sure if it
    // would update while playing (defaults to 1 btw);

    // console.log("SHOULD FINALLY be:", gain * (volumeRef.current / 100));

    const note = currentInstrument?.play(
      `${tuning[stringIdx]! + fret}`,
      audioContext.currentTime + when,
      {
        duration,
        gain: gain * (volume / 100),
      }
    );

    if (note && (prevTetheredNote || inlineEffect || isPalmMuted)) {
      playNoteWithEffects({
        note: note as unknown as GainNode,
        stringIdx,
        fret,
        bpm,
        when,
        inlineEffect,
        isPalmMuted,
        prevTetheredNote,
      });
    }

    // else if (note) {
    //   // if this works, extend it to effects as well
    //   console.log(
    //     "going through here",
    //     masterVolumeGainNode.current?.gain.value
    //   );

    //   note.connect(masterVolumeGainNode.current);
    //   const random = audioContext.createGain();
    //   // masterVolumeGainNode.current?.connect(audioContext.destination);
    //   masterVolumeGainNode.current?.connect(random); // still can hear when getting "rerouted" through this..
    // }

    // will do this same process inside of applyTetheredEffect() with the copy AudioBufferSourceNode
    // that is made
    if (!prevTetheredNote) {
      setTimeout(() => {
        if (currentNoteArrayRef.current[stringIdx]) {
          currentNoteArrayRef.current[stringIdx]?.stop();
        }

        currentNoteArrayRef.current[stringIdx] = note;
      }, when * 1000);
    }
  }

  function columnHasNoNotes(column: string[]) {
    for (let i = 1; i < 7; i++) {
      if (column[i] !== "") return false;
    }

    return true;
  }

  interface CompileChord {
    chordName: string;
    chordIdx: number;
    strummingPattern: StrummingPattern;
    chords: Chord[];
    stringifiedBpm: string;
    noteLengthMultiplier: string;
  }

  function compileChord({
    chordName,
    chordIdx,
    strummingPattern,
    chords,
    stringifiedBpm,
    noteLengthMultiplier,
  }: CompileChord) {
    if (chordName === "") {
      return [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        stringifiedBpm,
        noteLengthMultiplier,
      ];
    }

    let chordFrets: string[] = [];
    let chordEffect = "";

    const baseChordFrets =
      chords[chords.findIndex((chord) => chord.name === chordName)]?.frets;

    if (
      baseChordFrets &&
      strummingPattern.strums[chordIdx]?.strum.includes(">")
    ) {
      chordFrets = baseChordFrets.map((fret) => fret + ">");
      chordEffect = strummingPattern.strums[chordIdx]!.strum.at(0)!;
    } else if (baseChordFrets) {
      chordFrets = baseChordFrets;
      chordEffect = strummingPattern.strums[chordIdx]!.strum;
    }

    return [
      strummingPattern.strums[chordIdx]!.palmMute,
      ...chordFrets,
      chordEffect,
      stringifiedBpm,
      noteLengthMultiplier,
    ];
  }

  function generateDefaultSectionProgression(tabData: Section[]) {
    const sectionProgression: SectionProgression[] = [];

    for (let i = 0; i < tabData.length; i++) {
      sectionProgression.push({
        id: `${i}`,
        title: tabData[i]?.title ?? "",
        repetitions: 1,
      });
    }

    return sectionProgression;
  }

  function calculateRelativeVibratoFrequency(bpm: number) {
    // Ensure that the input number is positive
    const distance = Math.abs(bpm - 400);

    // Calculate the scale factor between 0 and 1.
    // When bpm: number is 400, scaleFactor will be 0.
    // When bpm: number is 0, scaleFactor will be 1.
    const scaleFactor = Math.min(distance / 400, 1);

    // Scale the number between 4 (when scaleFactor is 0)
    // and 6 (when scaleFactor is 1).
    return 4 + scaleFactor * (6 - 4);
  }

  function calculateRelativeChordDelayMultiplier(bpm: number) {
    // Ensure that the input number is positive
    const distance = Math.abs(bpm - 400);

    // Calculate the scale factor between 0 and 1.
    // When bpm: number is 400, scaleFactor will be 0.
    // When bpm: number is 0, scaleFactor will be 1.
    const scaleFactor = Math.min(distance / 400, 1);

    // Scale the number between 0.01 (when scaleFactor is 0)
    // and 0.05 (when scaleFactor is 1).
    return 0.01 + scaleFactor * (0.05 - 0.01);
  }

  function playNoteColumn(
    currColumn: string[],
    tuning: number[],
    capo: number,
    bpm: number,
    prevColumn?: string[]
  ) {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, (60 / bpm) * 1000);

      // as of right now I am barring ">" to be added to the column effects. It does make
      // some sense to allow it in there with "v/^/s" to match the ux of the strumming
      // pattern editor but I don't think it is a priority right now.

      // thinking it's better to group "s" in main if statement here
      // because I don't think you want to be super aggresive on deleting the prev
      // notes if they exist in column ux wise if someone were to add an "s" to [7]
      // while editing
      if (columnHasNoNotes(currColumn) || currColumn[7] === "s") {
        if (currColumn[7] === "s") {
          playSlapSound(currColumn[7].includes(">"));
          // TODO: technically I think the sound will bleed into the next note at high bpms
        }
        return;
      }

      let chordDelayMultiplier = 0;

      if (currColumn[7] === "v" || currColumn[7] === "^") {
        chordDelayMultiplier = calculateRelativeChordDelayMultiplier(bpm);
      }

      const allInlineEffects = /^[hp\/\\\\~>.bx]$/;
      const tetherEffects = /^[hp\/\\\\]$/;

      for (let index = 1; index < 7; index++) {
        // 1-6 is actually starting with "high e" normally, so reverse it if you want
        // to start with "low e" aka downwards strum
        const stringIdx = currColumn[7] === "v" ? 7 - index : index;

        const prevNote = prevColumn?.[stringIdx];
        const currNote = currColumn[stringIdx];

        const prevNoteHadTetherEffect =
          prevNote && tetherEffects.test(prevNote.at(-1)!);
        const currNoteHasTetherEffect =
          currNote && tetherEffects.test(currNote.at(-1)!);

        const currNoteEffect =
          currNote && allInlineEffects.test(currNote.at(-1)!)
            ? currNote.at(-1)!
            : undefined;

        if (currColumn[stringIdx] === "") continue;

        const adjustedStringIdx = stringIdx - 1; // adjusting for 0-indexing

        const fret =
          currColumn[stringIdx] === "x"
            ? 0
            : parseInt(currColumn[stringIdx]!) + capo;

        const prevNoteAndEffect =
          currColumn[7] === "" && prevColumn && prevNoteHadTetherEffect
            ? {
                note: parseInt(prevColumn[stringIdx]!) + capo,
                effect: prevNote.at(-1)!,
              }
            : undefined;

        playNote({
          tuning,
          stringIdx: adjustedStringIdx,
          fret,
          bpm,
          // want raw index instead of adjusted index since we only care about
          // how "far" into the chord the note is
          when: chordDelayMultiplier * (index - 1),
          effects: [
            ...(currColumn[0] !== "" ? ["PM"] : []),
            ...(currNoteEffect && !currNoteHasTetherEffect
              ? [currNoteEffect]
              : []),
          ],
          prevTetheredNote: prevNoteAndEffect,
        });
      }
    });
  }

  function getSectionIndexFromTitle(tabData: Section[], title: string) {
    for (let i = 0; i < tabData.length; i++) {
      if (tabData[i]?.title === title) {
        return i;
      }
    }

    return 0;
  }

  interface CompileFullTab {
    tabData: Section[];
    sectionProgression: SectionProgression[];
    chords: Chord[];
    baselineBpm: number;
  }

  function compileFullTab({
    tabData,
    sectionProgression,
    chords,
    baselineBpm,
  }: CompileFullTab) {
    const compiledChords: string[][] = [];
    const metadata: Metadata[] = [];

    for (
      let sectionProgressionIndex = 0;
      sectionProgressionIndex < sectionProgression.length;
      sectionProgressionIndex++
    ) {
      const sectionIndex = getSectionIndexFromTitle(
        tabData,
        sectionProgression[sectionProgressionIndex]!.title
      );
      const sectionRepetitions = getRepetitions(
        sectionProgression[sectionProgressionIndex]?.repetitions
      );

      for (
        let sectionRepeatIdx = 0;
        sectionRepeatIdx < sectionRepetitions;
        sectionRepeatIdx++
      ) {
        const section = tabData[sectionIndex]?.data;
        if (!section) continue;

        compileSection({
          section,
          sectionIndex,
          baselineBpm,
          compiledChords,
          metadata,
          chords,
        });
      }
    }

    setCurrentlyPlayingMetadata(metadata);

    return compiledChords;
  }

  interface CompileSpecificChordGrouping {
    tabData: Section[];
    location: {
      sectionIndex: number;
      subSectionIndex?: number;
      chordSequenceIndex?: number;
    };
    chords: Chord[];
    baselineBpm: number;
  }

  function compileSpecificChordGrouping({
    tabData,
    location,
    chords,
    baselineBpm,
  }: CompileSpecificChordGrouping) {
    const compiledChords: string[][] = [];
    const metadata: Metadata[] = [];

    // playing ONE chord sequence (for the repetition amount)
    if (
      location.chordSequenceIndex !== undefined &&
      location.subSectionIndex !== undefined &&
      location.sectionIndex !== undefined
    ) {
      const chordSequence =
        tabData[location.sectionIndex]!.data[location.subSectionIndex]!.data[
          location.chordSequenceIndex
        ];

      if (!chordSequence) return compiledChords;

      compileChordSequence({
        chordSequence: chordSequence as ChordSequence,
        sectionIndex: location.sectionIndex,
        subSectionIndex: location.subSectionIndex,
        chordSequenceIndex: location.chordSequenceIndex,
        baselineBpm,
        compiledChords,
        metadata,
        chords,
      });
    } else if (
      location.subSectionIndex !== undefined &&
      location.sectionIndex !== undefined
    ) {
      // playing ONE subsection (for the repetition amount)
      const subSection =
        tabData[location.sectionIndex]!.data[location.subSectionIndex];

      const subSectionRepetitions = getRepetitions(subSection?.repetitions);

      for (
        let subSectionRepeatIdx = 0;
        subSectionRepeatIdx < subSectionRepetitions;
        subSectionRepeatIdx++
      ) {
        if (!subSection) continue;

        if (subSection?.type === "tab") {
          compileTabSection({
            subSection,
            sectionIndex: location.sectionIndex,
            subSectionIndex: location.subSectionIndex,
            baselineBpm,
            compiledChords,
            metadata,
          });
        } else {
          compileChordSection({
            subSection,
            sectionIndex: location.sectionIndex,
            subSectionIndex: location.subSectionIndex,
            baselineBpm,
            compiledChords,
            metadata,
            chords,
          });
        }
      }
    } else if (location.sectionIndex !== undefined) {
      // playing ONE section (for the repetition amount)
      const section = tabData[location.sectionIndex]!.data;
      const sectionIndex = location.sectionIndex;

      compileSection({
        section,
        sectionIndex,
        baselineBpm,
        compiledChords,
        metadata,
        chords,
      });
    }

    setCurrentlyPlayingMetadata(metadata);

    return compiledChords;
  }

  interface CompileSection {
    section: (TabSection | ChordSection)[];
    sectionIndex: number;
    baselineBpm: number;
    compiledChords: string[][];
    metadata: Metadata[];
    chords: Chord[];
  }

  function compileSection({
    section,
    sectionIndex,
    baselineBpm,
    compiledChords,
    metadata,
    chords,
  }: CompileSection) {
    for (
      let subSectionIndex = 0;
      subSectionIndex < section.length;
      subSectionIndex++
    ) {
      const subSection = section[subSectionIndex];
      const subSectionRepetitions = getRepetitions(subSection?.repetitions);

      if (!subSection) continue;

      for (
        let subSectionRepeatIdx = 0;
        subSectionRepeatIdx < subSectionRepetitions;
        subSectionRepeatIdx++
      ) {
        if (subSection?.type === "tab") {
          compileTabSection({
            subSection,
            sectionIndex,
            subSectionIndex,
            baselineBpm,
            compiledChords,
            metadata,
          });
        } else {
          compileChordSection({
            subSection,
            sectionIndex,
            subSectionIndex,
            baselineBpm,
            compiledChords,
            metadata,
            chords,
          });
        }
      }
    }
  }

  interface CompileTabSection {
    subSection: TabSection;
    sectionIndex: number;
    subSectionIndex: number;
    baselineBpm: number;
    compiledChords: string[][];
    metadata: Metadata[];
  }

  function compileTabSection({
    subSection,
    sectionIndex,
    subSectionIndex,
    baselineBpm,
    compiledChords,
    metadata,
  }: CompileTabSection) {
    const data = subSection.data;

    for (let chordIdx = 0; chordIdx < data.length; chordIdx++) {
      const chord = [...data[chordIdx]!];

      if (chord?.[8] === "measureLine") continue;

      chord[8] = getBpmForChord(subSection.bpm, baselineBpm);
      chord[9] = "1";

      metadata.push({
        location: {
          sectionIndex,
          subSectionIndex,
          chordIndex: chordIdx,
        },
        bpm: Number(getBpmForChord(subSection.bpm, baselineBpm)),
        noteLengthMultiplier: "1",
      });

      compiledChords.push(chord);
    }
  }

  interface CompileChordSection {
    subSection: ChordSection;
    sectionIndex: number;
    subSectionIndex: number;
    baselineBpm: number;
    compiledChords: string[][];
    metadata: Metadata[];
    chords: Chord[];
  }

  function compileChordSection({
    subSection,
    sectionIndex,
    subSectionIndex,
    baselineBpm,
    compiledChords,
    metadata,
    chords,
  }: CompileChordSection) {
    const chordSection = subSection.data;

    for (
      let chordSequenceIndex = 0;
      chordSequenceIndex < chordSection.length;
      chordSequenceIndex++
    ) {
      const chordSequence = chordSection[chordSequenceIndex];

      if (!chordSequence) continue;

      compileChordSequence({
        chordSequence,
        sectionIndex,
        subSectionIndex,
        chordSequenceIndex,
        baselineBpm,
        compiledChords,
        metadata,
        chords,
      });
    }
  }

  interface CompileChordSequence {
    chordSequence: ChordSequence;
    sectionIndex: number;
    subSectionIndex: number;
    chordSequenceIndex: number;
    baselineBpm: number;
    compiledChords: string[][];
    metadata: Metadata[];
    chords: Chord[];
  }

  function compileChordSequence({
    chordSequence,
    sectionIndex,
    subSectionIndex,
    chordSequenceIndex,
    baselineBpm,
    compiledChords,
    metadata,
    chords,
  }: CompileChordSequence) {
    const chordSequenceRepetitions = getRepetitions(chordSequence?.repetitions);

    for (
      let chordSequenceRepeatIdx = 0;
      chordSequenceRepeatIdx < chordSequenceRepetitions;
      chordSequenceRepeatIdx++
    ) {
      let lastSpecifiedChordName: string | undefined = undefined;
      for (let chordIdx = 0; chordIdx < chordSequence.data.length; chordIdx++) {
        let chordName = chordSequence.data[chordIdx];

        // only want to update lastSpecifiedChordName if current chord name is not empty
        if (chordName !== "" && chordName !== lastSpecifiedChordName) {
          lastSpecifiedChordName = chordName;
        }

        if (
          chordName === "" &&
          chordSequence.strummingPattern.strums[chordIdx]?.strum !== ""
        ) {
          chordName = lastSpecifiedChordName;
        }

        const chordBpm = getBpmForChord(chordSequence.bpm, baselineBpm);

        let noteLengthMultiplier = "1";

        if (chordSequence.strummingPattern.noteLength === "1/4th triplet")
          noteLengthMultiplier = "0.6667";
        else if (chordSequence.strummingPattern.noteLength === "1/8th")
          noteLengthMultiplier = "0.5";
        else if (chordSequence.strummingPattern.noteLength === "1/8th triplet")
          noteLengthMultiplier = "0.3333";
        else if (chordSequence.strummingPattern.noteLength === "1/16th")
          noteLengthMultiplier = "0.25";
        else if (chordSequence.strummingPattern.noteLength === "1/16th triplet")
          noteLengthMultiplier = "0.1667";

        metadata.push({
          location: {
            sectionIndex,
            subSectionIndex,
            chordSequenceIndex,
            chordIndex: chordIdx,
          },
          bpm: Number(chordBpm),
          noteLengthMultiplier,
        });

        compiledChords.push(
          compileChord({
            chordName: chordName ?? "",
            chordIdx,
            strummingPattern: chordSequence.strummingPattern,
            chords,
            stringifiedBpm: chordBpm,
            noteLengthMultiplier,
          })
        );
      }
    }
  }

  // GENERAL GAME PLAN:

  // new state to create + export at top of this file: currentlyPlayingMetadata & currentChordIdx
  // currentlyPlayingMetadata is of this shape:  { noteLengthMultiplier: number,
  //                                               location: { sectionIdx: number, subSectionIdx: number, chordSequenceIdx: number, I think one more right? for like specific chordIdx I think }
  //     ^^ okay so yeah i think for a tab chord it would need section, subSection, and chordIdx
  //        but for a specific chord from a strumming pattern it would need section, subSection, chordSequence, and chordIdx

  // isSectionStart will just be inferred based on if subSectionIdx + chordSequenceIdx are 0 (fact check this logic)

  // fyi yeah so clicking on a tab input/interacting idk when paused and currentChordIdx !== 0,
  // will just set currentChordIdx to 0 to get rid of all red overlay + reset audio slider

  // also metadata above will have to be created respective to each indiv. chord, and when the tab is playing you will need to increment currentChordIdx at start
  // of playNoteColumn()

  // the audio controls bar will loop through the metadata array created above in order to properly space out the hidden chord divs (each having their length * noteLengthMultiplier)
  // ^ this is really a css issue to get them to all fit together, don't worry too much about it right now.

  // ^^ okay so this will not be efficient however you should try having an effect in here that listens to w/e necessary (tabData, sectionProgression, etc) that will do compileSpecificChordGrouping()/compileFullTab()
  // and set the currentChordIdx to 0 and if you have a separate state for the "tab location indicies" then update that too to the values that point to the start of the current "section"

  // fyi currently thinking of having "disabled/blocked" cursor on inputs/buttons or idk maybe just a hidden div that is the same size as the section that will effectively prevent
  // any interaction with the tab as it is playing. If audio is paused halfway through a section however, then we will need to allow interaction again, and on first interaction maybe
  // reset the currentChordIdx to the start of the section and then let the user do w/e they want from there?

  interface PlayRecordedAudio {
    recordedAudioUrl: string;
    secondsElapsed: number;
  }

  function playRecordedAudio({
    recordedAudioUrl,
    secondsElapsed,
  }: PlayRecordedAudio) {
    // going to try and use the web audio api here too, just loading in the audio file and playingAudio it
    // from the secondsElapsed and ofc respecting the volume level too
  }

  async function pauseRecordedAudio() {
    // adj below for the actual audio file
    // setPlayingAudio(false);
    // currentInstrument?.stop();
    // breakOnNextNote.current = true;
    // await audioContext?.suspend();
  }

  interface PlayTab {
    tabData: Section[];
    rawSectionProgression: SectionProgression[];
    tuningNotes: string;
    baselineBpm: number;
    capo?: number;
    chords: Chord[];
    location?: {
      sectionIndex: number;
      subSectionIndex?: number;
      chordSequenceIndex?: number;
    };
  }

  async function playTab({
    tabData,
    rawSectionProgression,
    tuningNotes,
    baselineBpm,
    chords,
    capo = 0,
    location,
  }: PlayTab) {
    await audioContext?.resume();

    const sectionProgression =
      rawSectionProgression.length > 0
        ? rawSectionProgression
        : generateDefaultSectionProgression(tabData); // I think you could get by without doing this, but leave it for now
    const tuning = parse(tuningNotes);

    setPlayingAudio(true);

    const compiledChords = location
      ? compileSpecificChordGrouping({
          tabData,
          location,
          chords,
          baselineBpm,
        })
      : compileFullTab({
          tabData,
          sectionProgression,
          chords,
          baselineBpm,
        });

    for (
      let chordIndex = currentChordIndex;
      chordIndex < compiledChords.length;
      chordIndex++
    ) {
      if (breakOnNextNote.current) {
        breakOnNextNote.current = false;
        break;
      }

      const prevColumn = compiledChords[chordIndex - 1];
      const column = compiledChords[chordIndex];

      if (column === undefined) continue;

      // alteredBpm = bpm for chord * (1 / noteLengthMultiplier)
      const alteredBpm = Number(column[8]) * (1 / Number(column[9]));

      await playNoteColumn(column, tuning, capo ?? 0, alteredBpm, prevColumn);

      setCurrentChordIndex(chordIndex + 1);
    }

    setTimeout(() => {
      setPlayingAudio(false);
      currentInstrument?.stop();
      setCurrentChordIndex(0);
    }, 1500);
  }

  async function pauseTab() {
    setPlayingAudio(false);
    currentInstrument?.stop();
    breakOnNextNote.current = true;

    await audioContext?.suspend();
  }

  // function playChord()
  // could actually probably use this for regular strumming a chord and for the "chord preview" sound!
  // meaning you would have to directly export this function to use in the chord preview component

  return {
    playTab,
    pauseTab,
    playRecordedAudio,
    pauseRecordedAudio,
  };
}
