import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";

interface StaticPalmMuteNode {
  value: string;
  color: string;
  theme: "light" | "dark";
}

function StaticPalmMuteNode({ value, color, theme }: StaticPalmMuteNode) {
  return (
    <>
      {(value === "start" || value === "end") && (
        <>
          {value === "start" && (
            <div className="baseFlex w-full">
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className="h-[14px] w-[1px]"
              ></div>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className="h-[1px] w-1"
              ></div>
              <i
                style={{
                  color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className="mx-[0.125rem]"
              >
                PM
              </i>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className="h-[1px] w-[3px]"
              ></div>
            </div>
          )}

          {value === "end" && (
            <div className="baseFlex w-full">
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className="h-[1px] w-full"
              ></div>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className="h-[14px] w-[1px]"
              ></div>
            </div>
          )}
        </>
      )}

      {value === "-" && <div className="h-[1px] w-full"></div>}
    </>
  );
}

export default StaticPalmMuteNode;
