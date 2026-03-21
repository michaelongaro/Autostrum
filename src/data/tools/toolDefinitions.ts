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
      "Structured finger-independence and dexterity drills with guided tempo progression.",
    category: "Practice",
    href: "/tools/warmups",
    status: "in-progress",
  },
  {
    id: "scales",
    title: "Scales Practice",
    description:
      "Practice common guitar scale patterns across positions with repeat-focused sessions.",
    category: "Practice",
    href: "/tools/scales",
    status: "in-progress",
  },
  {
    id: "metronome",
    title: "Metronome",
    description:
      "Train timing with adjustable BPM, time signature, subdivisions, and accented downbeats.",
    category: "Rhythm",
    href: "/tools/metronome",
    status: "available",
  },
  {
    id: "note-trainer",
    title: "Audible Note Trainer",
    description:
      "Hear a target note, guess it, and get instant feedback with round-by-round scoring.",
    category: "Ear Training",
    href: "/tools/note-trainer",
    status: "available",
  },
  {
    id: "tuner",
    title: "Guitar Tuner",
    description:
      "Tune each string with real-time pitch and cents feedback powered by your microphone.",
    category: "Tuning",
    href: "/tuner",
    status: "available",
  },
];
