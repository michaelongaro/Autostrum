import localFont from "next/font/local";

// Keep font loading independent of Google Fonts responses during compilation.
export const notoSans = localFont({
  src: [
    {
      path: "../../styles/fonts/noto-sans-latin.woff2",
      weight: "400 700",
      style: "normal",
    },
    {
      path: "../../styles/fonts/noto-sans-italic-latin.woff2",
      weight: "400 700",
      style: "italic",
    },
  ],
  display: "swap",
  fallback: ["Noto Sans Extended", "Arial", "sans-serif"],
});
