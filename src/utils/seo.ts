export const SITE_URL = (
  process.env.NEXT_PUBLIC_DOMAIN_URL ?? "https://www.autostrum.com"
).replace(/\/$/, "");

export const DEFAULT_SEO_TITLE =
  "Autostrum | Guitar Tabs, Playback & Practice Tools";

export const DEFAULT_SEO_DESCRIPTION =
  "Discover guitar tabs, hear how they sound, and learn at your own pace. Create and share tabs, or practice with free guitar tools on Autostrum.";

export const OPEN_GRAPH_IMAGE = {
  path: "/opengraphScreenshots/homepage-hero.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "Autostrum homepage hero showing guitar tab playback, practice controls, and links to explore or create tabs.",
} as const;

export function getCanonicalUrl(path: string) {
  const url = new URL(path, SITE_URL);
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/$/, "") || "/";
  return url.toString();
}
