export type ToolCategory = "Practice" | "Rhythm" | "Ear Training" | "Tuning";

export type ToolDefinition = {
  id: string;
  title: string;
  description: string;
  category: ToolCategory;
  href: string;
  status: "available" | "in-progress";
};

export const toolDefinitions: ToolDefinition[] = [
  {
    id: "warmups",
    title: "Warm-up Exercises",
    description:
      "Finger, picking, and stretch drills for every level — from open strings to sweeps.",
    category: "Practice",
    href: "/tools/warmups",
    status: "available",
  },
  {
    id: "scales",
    title: "Scales Practice",
    description:
      "Pentatonics, open scales, movable shapes, modes, and sequences across every skill level.",
    category: "Practice",
    href: "/tools/scales",
    status: "available",
  },
  {
    id: "chord-trainer",
    title: "Chord Trainer",
    description:
      "Pick a chord set, or make your own, and practice smoother transitions between shapes.",
    category: "Practice",
    href: "/tools/chord-trainer",
    status: "available",
  },
  {
    id: "metronome",
    title: "Metronome",
    description:
      "A simple, customizable click to help you lock in your timing and play on beat.",
    category: "Rhythm",
    href: "/tools/metronome",
    status: "available",
  },
  {
    id: "note-trainer",
    title: "Note Trainer",
    description:
      "Train your ear to recognize different notes across the fretboard.",
    category: "Ear Training",
    href: "/tools/note-trainer",
    status: "available",
  },
  {
    id: "tuner",
    title: "Guitar Tuner",
    description:
      "A quick and accurate microphone tuner to get your guitar sounding right.",
    category: "Tuning",
    href: "/tuner",
    status: "available",
  },
];
