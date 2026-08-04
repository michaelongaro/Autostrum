import {
  Head,
  Html,
  Main,
  NextScript,
  type DocumentProps,
} from "next/document";
import { LOGO_PATHS_WITHOUT_TITLE } from "~/utils/logoPaths";
import { COLOR_VALUES } from "~/utils/updateCSSThemeVars";

const DEFAULT_COLOR = "maple";
const STORAGE_KEYS = {
  COLOR: "autostrum-color",
  THEME: "autostrum-theme",
  FOLLOWS_DEVICE_THEME: "autostrum-follows-device-theme",
} as const;

const HEADER_COLORS = Object.fromEntries(
  Object.entries(COLOR_VALUES).map(([color, themes]) => [
    color,
    {
      light: themes.light.header,
      dark: themes.dark.header,
    },
  ]),
);

const serializeForInlineScript = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

const DYNAMIC_FAVICON_ID = "dynamic-favicon";

const themeInitializerScript = `
(() => {
  const faviconPaths = ${serializeForInlineScript(LOGO_PATHS_WITHOUT_TITLE)};
  const headerColors = ${serializeForInlineScript(HEADER_COLORS)};
  const storageKeys = ${serializeForInlineScript(STORAGE_KEYS)};
  const defaultColor = ${serializeForInlineScript(DEFAULT_COLOR)};
  const dynamicFaviconId = ${serializeForInlineScript(DYNAMIC_FAVICON_ID)};
  const validColors = new Set(Object.keys(faviconPaths));

  try {
    const storedColor = window.localStorage.getItem(storageKeys.COLOR);
    const storedTheme = window.localStorage.getItem(storageKeys.THEME);
    const followsDevice =
      window.localStorage.getItem(storageKeys.FOLLOWS_DEVICE_THEME) !== "false";

    const color = validColors.has(storedColor) ? storedColor : defaultColor;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const theme =
      followsDevice || (storedTheme !== "light" && storedTheme !== "dark")
        ? systemTheme
        : storedTheme;

    const root = document.documentElement;
    root.setAttribute("data-color", color);
    root.setAttribute("data-theme", theme);

    let faviconLink = document.querySelector(
      "link#" + dynamicFaviconId,
    );
    if (!faviconLink) {
      faviconLink = document.createElement("link");
      faviconLink.setAttribute("id", dynamicFaviconId);
      faviconLink.setAttribute("rel", "icon");
      faviconLink.setAttribute("type", "image/svg+xml");
      document.head.appendChild(faviconLink);
    }

    const faviconPath = faviconPaths[color];
    if (faviconPath) {
      faviconLink.setAttribute("href", faviconPath);
    }

    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }

    const headerColor = headerColors[color]?.[theme];
    if (headerColor) {
      metaThemeColor.setAttribute("content", \`hsl(\${headerColor})\`);
    }
  } catch {
    // noop: allow the app to continue rendering if localStorage is unavailable
  }
})();
`;

function Document(_props: DocumentProps) {
  return (
    <Html lang="en" data-color={DEFAULT_COLOR} data-theme="light">
      <Head>
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link
          id={DYNAMIC_FAVICON_ID}
          rel="icon"
          href="/favicon.svg"
          type="image/svg+xml"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitializerScript,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

export default Document;
