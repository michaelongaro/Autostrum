export const COPY = {
  brand: "Autostrum",
  tagline: "Create and share your riffs exactly how you want them to sound",
  support:
    "An advanced tab editor that cuts repetitive work — then practice any tab with realistic generated guitar audio.",
  compose: {
    title: "Compose",
    body: "Craft intricate guitar tabs with an advanced editor — strumming patterns, keyboard navigation, and more",
    details: [
      "Strumming patterns & chord sections",
      "Note tab sections & section progression",
      "Keyboard navigation & shortcuts",
      "Named chords with diagrams",
      "Tunings, capo, BPM, key, difficulty",
      "Effects: hammer-ons, slides, bends, vibrato, palm mute, and more",
    ],
  },
  inspiration: {
    title: "Find inspiration",
    body: "Explore a growing library and discover creators in weekly featured",
    details: [
      "Browse by genre, tuning, capo, difficulty",
      "Search by song or artist",
      "Theme-aware screenshot previews",
      "Weekly featured creators",
      "Popular & recently added discovery",
    ],
  },
  practice: {
    title: "Practice",
    body: "Play along with realistic generated audio; change speed and instrument; practice sections",
    details: [
      "Generated guitar audio (soundfonts + Web Audio)",
      "Speed 0.25x–1.5x",
      "Loop ranges & count-in",
      "Nylon, steel, electric clean/jazz",
      "Section practice & in-app tuner",
      "Screen wake lock while practicing",
    ],
  },
} as const;

export const GENRES = [
  "Rock",
  "Indie",
  "Jazz",
  "Pop",
  "Folk",
  "Country",
  "Blues",
  "Hip-Hop",
  "Electronic",
  "Classical",
  "Metal",
  "Misc.",
] as const;

export const ACCENT_SWATCHES = [
  { id: "peony", label: "Peony", hex: "#D6409F" },
  { id: "coral", label: "Coral", hex: "#F76B15" },
  { id: "saffron", label: "Saffron", hex: "#FFC53D" },
  { id: "maple", label: "Maple", hex: "#A18072" },
  { id: "pistachio", label: "Pistachio", hex: "#99D52A" },
  { id: "verdant", label: "Verdant", hex: "#46A758" },
  { id: "aqua", label: "Aqua", hex: "#12A594" },
  { id: "sapphire", label: "Sapphire", hex: "#3E63DD" },
  { id: "amethyst", label: "Amethyst", hex: "#8E4EC6" },
] as const;

export const SAMPLE_TAB = {
  title: "Everlong",
  artist: "Foo Fighters",
  genre: "Rock",
  difficulty: 4,
  date: "10/25/2023",
  href: "/explore",
} as const;

export const FEATURED_CREATORS = [
  {
    username: "leyendo",
    tabs: 57,
    views: "1.5K",
    rating: "4.1",
    bookmarks: 10,
    pinned: "The Avatar's Love",
  },
  {
    username: "riffcraft",
    tabs: 34,
    views: "980",
    rating: "4.6",
    bookmarks: 22,
    pinned: "Mad World",
  },
  {
    username: "nylonnotes",
    tabs: 19,
    views: "720",
    rating: "4.3",
    bookmarks: 8,
    pinned: "Canon in D",
  },
] as const;

export const EDITOR_SHORTCUTS = [
  { keys: "Tab", label: "Next note" },
  { keys: "Shift+Tab", label: "Previous note" },
  { keys: "↑ ↓", label: "Change string" },
  { keys: "1–9", label: "Set fret" },
  { keys: "Space", label: "Preview chord" },
  { keys: "P", label: "Play section" },
] as const;

export type VariationMeta = {
  slug: string;
  number: number;
  title: string;
  shortTitle: string;
  summary: string;
  emphasis: string;
  forceDark?: boolean;
};

export const VARIATIONS: VariationMeta[] = [
  {
    slug: "product-demo",
    number: 1,
    title: "Product-demo hero",
    shortTitle: "Product demo",
    summary:
      "Full-bleed editor as the visual plane; brand and CTAs over the product.",
    emphasis: "Editor-led",
  },
  {
    slug: "atmospheric-studio",
    number: 2,
    title: "Atmospheric studio",
    shortTitle: "Atmospheric",
    summary:
      "Gradient, noise, and soft guitar atmosphere with a brand-first open hero.",
    emphasis: "Brand atmosphere",
  },
  {
    slug: "split-narrative",
    number: 3,
    title: "Split narrative",
    shortTitle: "Split",
    summary:
      "Left brand and copy; right a live-feeling tab card with practice green.",
    emphasis: "Practice cue",
  },
  {
    slug: "compose-forward",
    number: 4,
    title: "Compose-forward",
    shortTitle: "Compose",
    summary:
      "Keyboard shortcuts and chord/strumming diagrams lead the hero story.",
    emphasis: "Creators first",
  },
  {
    slug: "practice-forward",
    number: 5,
    title: "Practice-forward",
    shortTitle: "Practice",
    summary:
      "Playback modal, speed, loop, and instruments as the hero story.",
    emphasis: "Casual players",
  },
  {
    slug: "library-explore",
    number: 6,
    title: "Library / Explore",
    shortTitle: "Library",
    summary:
      "Genre mosaic and featured creators — discovery-led with brand still hero-level.",
    emphasis: "Discovery",
  },
  {
    slug: "dark-maple-night",
    number: 7,
    title: "Dark maple night session",
    shortTitle: "Night session",
    summary:
      "Warm dark theme primary; soft cream type; nocturnal practice vibe.",
    emphasis: "Dark maple",
    forceDark: true,
  },
  {
    slug: "minimal-utility",
    number: 8,
    title: "Minimal utility",
    shortTitle: "Minimal",
    summary:
      "Extreme restraint: brand, one line, two CTAs, one product frame.",
    emphasis: "Quiet utility",
  },
  {
    slug: "toolkit-showcase",
    number: 9,
    title: "Toolkit showcase",
    shortTitle: "Toolkit",
    summary:
      "Tools hub as a secondary hero band after the main pitch.",
    emphasis: "Free tools",
  },
  {
    slug: "social-creator",
    number: 10,
    title: "Social creator",
    shortTitle: "Creators",
    summary:
      "Profiles, weekly featured, ratings and bookmarks — get discovered.",
    emphasis: "Community",
  },
];

export function getVariation(slug: string): VariationMeta | undefined {
  return VARIATIONS.find((v) => v.slug === slug);
}
