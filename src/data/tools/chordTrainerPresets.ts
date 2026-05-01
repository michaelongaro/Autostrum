import { CHORD_COLORS, getColorForChordName } from "~/utils/chordColors";

type RawChordTrainerPreset = {
  id: string;
  name: string;
  voicing: [string, string, string, string, string, string];
};

export type ChordTrainerPreset = {
  id: string;
  name: string;
  color: string;
  frets: [string, string, string, string, string, string];
  voicing: [string, string, string, string, string, string];
};

const rawChordTrainerPresets: RawChordTrainerPreset[] = [
  {
    id: "c",
    name: "C",
    voicing: ["x", "3", "2", "0", "1", "0"],
  },
  {
    id: "g",
    name: "G",
    voicing: ["3", "2", "0", "0", "0", "3"],
  },
  {
    id: "am",
    name: "Am",
    voicing: ["x", "0", "2", "2", "1", "0"],
  },
  {
    id: "f",
    name: "F",
    voicing: ["1", "3", "3", "2", "1", "1"],
  },
  {
    id: "em",
    name: "Em",
    voicing: ["0", "2", "2", "0", "0", "0"],
  },
  {
    id: "d",
    name: "D",
    voicing: ["x", "x", "0", "2", "3", "2"],
  },
  {
    id: "a",
    name: "A",
    voicing: ["x", "0", "2", "2", "2", "0"],
  },
  {
    id: "e",
    name: "E",
    voicing: ["0", "2", "2", "1", "0", "0"],
  },
  {
    id: "dm",
    name: "Dm",
    voicing: ["x", "x", "0", "2", "3", "1"],
  },
  {
    id: "cmaj7",
    name: "Cmaj7",
    voicing: ["x", "3", "2", "0", "0", "0"],
  },
  {
    id: "g7",
    name: "G7",
    voicing: ["3", "2", "0", "0", "0", "1"],
  },
  {
    id: "d7",
    name: "D7",
    voicing: ["x", "x", "0", "2", "1", "2"],
  },
  {
    id: "b7",
    name: "B7",
    voicing: ["x", "2", "1", "2", "0", "2"],
  },
  {
    id: "asus2",
    name: "Asus2",
    voicing: ["x", "0", "2", "2", "0", "0"],
  },
  {
    id: "dsus4",
    name: "Dsus4",
    voicing: ["x", "x", "0", "2", "3", "3"],
  },
  {
    id: "bb",
    name: "Bb",
    voicing: ["x", "1", "3", "3", "3", "1"],
  },
];

function reverseVoicing(
  voicing: RawChordTrainerPreset["voicing"],
): ChordTrainerPreset["frets"] {
  const reversedVoicing = [...voicing]
    .reverse()
    .map((fret) => (fret === "x" ? "" : fret));

  return [
    reversedVoicing[0] ?? "",
    reversedVoicing[1] ?? "",
    reversedVoicing[2] ?? "",
    reversedVoicing[3] ?? "",
    reversedVoicing[4] ?? "",
    reversedVoicing[5] ?? "",
  ];
}

export const chordTrainerPresets: ChordTrainerPreset[] =
  rawChordTrainerPresets.map((preset, index) => ({
    id: preset.id,
    name: preset.name,
    voicing: preset.voicing,
    frets: reverseVoicing(preset.voicing),
    color:
      getColorForChordName(preset.name) ??
      CHORD_COLORS[index % CHORD_COLORS.length] ??
      "#3E63DD",
  }));
