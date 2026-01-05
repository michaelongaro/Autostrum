import PauseIcon from "~/components/ui/icons/PauseIcon";
import type { COLORS, THEME } from "~/stores/TabStore";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";

interface StaticTabNote {
  note: string;
  isAccented?: boolean;
  isStaccato?: boolean;
  isRest?: boolean;
  color: COLORS;
  theme: THEME;
}

function StaticTabNote({
  note,
  isAccented,
  isStaccato,
  isRest,
  color,
  theme,
}: StaticTabNote) {
  return (
    <div className="baseFlex w-full">
      <div
        style={{
          backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]} / 0.5)`,
        }}
        className="my-3 h-[1px] flex-[1]"
      ></div>
      <div
        // "x" wasn't as centered as regular numbers were, manual adjustment below
        style={{
          marginTop: note === "x" ? "-2px" : "0px",
          marginBottom: note === "x" ? "2px" : "0px",
          color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
        }}
        className={`baseFlex relative ${isAccented ? "font-bold" : ""}`}
      >
        {isRest ? (
          <PauseIcon className="absolute bottom-1.5 size-3" />
        ) : (
          <div>{note}</div>
        )}

        {isStaccato && <div className="relative -top-2">.</div>}
      </div>
      <div
        style={{
          backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]} / 0.5)`,
        }}
        className="my-3 h-[1px] flex-[1]"
      ></div>
    </div>
  );
}

export default StaticTabNote;
