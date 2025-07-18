// FYI: I recognize that this no longer is a fantastic variable name...

export const genreList = new Map<string, string>([
  ["Rock", "oklch(50.5% 0.213 27.518)"], // red-700
  ["Indie", "oklch(55.3% 0.195 38.402)"], // orange-700
  ["Jazz", "oklch(68.1% 0.162 75.834)"], // yellow-600
  ["Pop", "oklch(64.8% 0.2 131.684)"], // lime-600
  ["Folk", "oklch(52% 0.105 223.128)"], // cyan-700
  ["Country", "oklch(51.1% 0.096 186.391)"], // teal-700
  ["Blues", "oklch(48.8% 0.243 264.376)"], // blue-700
  ["Hip-Hop", "oklch(49.6% 0.265 301.924)"], // purple-700
  ["Electronic", "oklch(52.5% 0.223 3.958)"], // pink-700
  ["Classical", "oklch(55.5% 0.163 48.998)"], // amber-700
  ["Metal", "oklch(37% 0.013 285.805)"], // zinc-700
  ["Misc.", "oklch(50% 0.134 242.749)"], // sky-700
]);

// all 200 level shades of above colors
export const genreLightList = new Map<string, string>([
  ["Rock", "oklch(88.5% 0.062 18.334)"],
  ["Indie", "oklch(90.1% 0.076 70.697)"],
  ["Jazz", "oklch(94.5% 0.129 101.54)"],
  ["Pop", "oklch(93.8% 0.127 124.321)"],
  ["Folk", "oklch(91.7% 0.08 205.041)"],
  ["Country", "oklch(91% 0.096 180.426)"],
  ["Blues", "oklch(88.2% 0.059 254.128)"],
  ["Hip-Hop", "oklch(90.2% 0.063 306.703)"],
  ["Electronic", "oklch(89.9% 0.061 343.231)"],
  ["Classical", "oklch(92.4% 0.12 95.746)"],
  ["Metal", "oklch(92% 0.004 286.32)"],
  ["Misc.", "oklch(90.1% 0.058 230.902)"],
]);
