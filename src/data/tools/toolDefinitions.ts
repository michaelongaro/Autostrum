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
      "Build finger strength and dexterity before jumping into your next practice session.",
    category: "Practice",
    href: "/tools/warmups",
    status: "available",
  },
  {
    id: "scales",
    title: "Scales Practice",
    description:
      "Practice common scale patterns and get more familiar with moving around the fretboard.",
    category: "Practice",
    href: "/tools/scales",
    status: "available",
  },
  {
    id: "chord-trainer",
    title: "Chord Trainer",
    description:
      "Build smoother chord changes with ready-made sets or create your own.",
    category: "Practice",
    href: "/tools/chord-trainer",
    status: "available",
  },
  {
    id: "metronome",
    title: "Metronome",
    description:
      "Find your rhythm and stay on beat with a simple, customizable click.",
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
    description: "Get in tune quickly and accurately using your microphone.",
    category: "Tuning",
    href: "/tuner",
    status: "available",
  },
];
