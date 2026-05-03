import {
  Head,
  Html,
  Main,
  NextScript,
  type DocumentProps,
} from "next/document";
import { LOGO_PATHS_WITHOUT_TITLE } from "~/utils/logoPaths";
import { COLOR_VALUES } from "~/utils/updateCSSThemeVars";

const DEFAULT_COLOR = "peony";
const STORAGE_KEYS = {
  COLOR: "autostrum-color",
  THEME: "autostrum-theme",
  FOLLOWS_DEVICE_THEME: "autostrum-follows-device-theme",
} as const;

const serializeForInlineScript = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

const themeInitializerScript = `
(() => {
  const colorValues = ${serializeForInlineScript(COLOR_VALUES)};
  const faviconPaths = ${serializeForInlineScript(LOGO_PATHS_WITHOUT_TITLE)};
  const storageKeys = ${serializeForInlineScript(STORAGE_KEYS)};
  const defaultColor = ${serializeForInlineScript(DEFAULT_COLOR)};

  try {
    const storedColor = window.localStorage.getItem(storageKeys.COLOR);
    const storedTheme = window.localStorage.getItem(storageKeys.THEME);
    const storedFollowsDeviceTheme = window.localStorage.getItem(
      storageKeys.FOLLOWS_DEVICE_THEME,
    );

    const isValidColor = (color) => Boolean(color && colorValues[color]);
    const resolvedColor = isValidColor(storedColor) ? storedColor : defaultColor;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const followsDeviceTheme = storedFollowsDeviceTheme !== "false";
    const resolvedTheme =
      followsDeviceTheme || !storedTheme || !colorValues[resolvedColor]?.[storedTheme]
        ? systemTheme
        : storedTheme;
    const resolvedColors = colorValues[resolvedColor]?.[resolvedTheme];

    if (!resolvedColors) return;

    Object.entries(resolvedColors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(\`--\${key}\`, String(value));
    });

    let faviconLink = document.querySelector("link[rel~='icon']");
    if (!faviconLink) {
      faviconLink = document.createElement("link");
      faviconLink.setAttribute("rel", "icon");
      document.head.appendChild(faviconLink);
    }

    const faviconPath = faviconPaths[resolvedColor];
    if (faviconPath) {
      faviconLink.setAttribute("href", faviconPath);
    }

    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }

    const headerColor = resolvedColors.header;
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
    <Html lang="en">
      <Head>
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
