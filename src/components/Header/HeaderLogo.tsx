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

// FYI: not sure if this approach is required, however the view transition didn't work
// when just swapping to an image that was cached
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
