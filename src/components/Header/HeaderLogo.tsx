import { LOGO_PATHS_WITH_TITLE } from "~/utils/logoPaths";

const HEADER_LOGO_COLORS = [
  "peony",
  "coral",
  "saffron",
  "maple",
  "pistachio",
  "verdant",
  "aqua",
  "sapphire",
  "amethyst",
] as const;

interface HeaderLogo {
  width: number;
  height: number;
  className?: string;
}

/**
 * Renders every color variant and reveals the active one via
 * html[data-color] CSS. That keeps logo swaps inside View Transitions
 * (unlike swapping a single <img> src from React after the VT callback).
 */
function HeaderLogo({ width, height, className }: HeaderLogo) {
  return (
    <span
      className={`headerLogo${className ? ` ${className}` : ""}`}
      style={{ width, height }}
    >
      {HEADER_LOGO_COLORS.map((color) => (
        <img
          key={color}
          src={LOGO_PATHS_WITH_TITLE[color]}
          alt=""
          width={width}
          height={height}
          decoding="async"
          draggable={false}
          data-logo-color={color}
          className="headerLogoLayer"
        />
      ))}
      <span className="sr-only">Autostrum header logo</span>
    </span>
  );
}

export default HeaderLogo;
