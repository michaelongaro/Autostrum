import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";

function renderStaticStrummingGuide(
  noteLength: string,
  beatIndex: number,
  color: string,
  theme: "light" | "dark",
) {
  let innermostDiv = <div></div>;
  let height = "7px";
  switch (noteLength) {
    case "1/4th":
      height = "6px";
      innermostDiv = (
        <div
          style={{
            backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
          }}
          className={`h-full w-[1px] rounded-md`}
        ></div>
      );

      break;
    case "1/8th":
      height = "7px";
      innermostDiv = (
        <>
          <div
            style={{
              backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
            }}
            className={`h-full w-[1px] rounded-md`}
          ></div>

          {beatIndex % 2 === 0 ? (
            <div
              style={{
                backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
              }}
              className={`absolute bottom-0 right-0 h-[1px] w-1/2`}
            ></div>
          ) : (
            <div
              style={{
                backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
              }}
              className={`absolute bottom-0 left-0 right-0 h-[1px] w-1/2`}
            ></div>
          )}
        </>
      );
      break;
    case "1/16th":
      height = "7px";
      innermostDiv = (
        <>
          <div
            style={{
              backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
            }}
            className={`h-full w-[1px] rounded-md`}
          ></div>

          {beatIndex % 2 === 0 ? (
            <>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute bottom-[2px] right-0 h-[1px] w-1/2`}
              ></div>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute bottom-0 right-0 h-[1px] w-1/2`}
              ></div>
            </>
          ) : (
            <>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute bottom-[2px] left-0 right-0 h-[1px] w-1/2`}
              ></div>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute bottom-0 left-0 right-0 h-[1px] w-1/2`}
              ></div>
            </>
          )}
        </>
      );
      break;

    case "1/4th triplet":
      height = "25px";
      innermostDiv = (
        <div className="baseVertFlex h-full w-full !flex-nowrap !justify-start">
          <div
            style={{
              backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
            }}
            className={`h-[7px] w-[1px] rounded-md`}
          ></div>
          {beatIndex % 3 === 1 && (
            <span
              style={{
                color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
              }}
              className={`mt-[3px] text-xs`}
            >
              3
            </span>
          )}
        </div>
      );

      break;
    case "1/8th triplet":
      height = "25px";

      innermostDiv = (
        <div className="baseVertFlex relative h-full w-full !flex-nowrap !justify-start">
          <div
            style={{
              backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
            }}
            className={`h-[7px] w-[1px] rounded-md`}
          ></div>
          {beatIndex % 3 === 0 && (
            <div
              style={{
                backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
              }}
              className={`absolute right-0 top-[6px] h-[1px] w-1/2`}
            ></div>
          )}

          {beatIndex % 3 === 1 && (
            <>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute right-0 top-[6px] h-[1px] w-1/2`}
              ></div>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute left-0 top-[6px] h-[1px] w-1/2`}
              ></div>
            </>
          )}

          {beatIndex % 3 === 2 && (
            <>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute left-0 top-[6px] h-[1px] w-1/2`}
              ></div>
            </>
          )}

          {beatIndex % 3 === 1 && (
            <span
              style={{
                color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
              }}
              className={`mt-[3px] text-xs`}
            >
              3
            </span>
          )}
        </div>
      );
      break;
    case "1/16th triplet":
      height = "25px";
      innermostDiv = (
        <div className="baseVertFlex relative h-full w-full !flex-nowrap !justify-start">
          <div
            style={{
              backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
            }}
            className={`h-[7px] w-[1px] rounded-md`}
          ></div>
          {beatIndex % 3 === 0 && (
            <>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute right-0 top-[4px] h-[1px] w-1/2`}
              ></div>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute right-0 top-[6px] h-[1px] w-1/2`}
              ></div>
            </>
          )}

          {beatIndex % 3 === 1 && (
            <>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute right-0 top-[4px] h-[1px] w-1/2`}
              ></div>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute right-0 top-[6px] h-[1px] w-1/2`}
              ></div>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute left-0 top-[4px] h-[1px] w-1/2`}
              ></div>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute left-0 top-[6px] h-[1px] w-1/2`}
              ></div>
            </>
          )}

          {beatIndex % 3 === 2 && (
            <>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute left-0 top-[4px] h-[1px] w-1/2`}
              ></div>
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className={`absolute left-0 top-[6px] h-[1px] w-1/2`}
              ></div>
            </>
          )}

          {beatIndex % 3 === 1 && (
            <span
              style={{
                color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
              }}
              className={`mt-[3px] text-xs`}
            >
              3
            </span>
          )}
        </div>
      );
      break;
  }

  return (
    <div
      style={{
        height,
      }}
      className="baseFlex relative w-full !flex-nowrap"
    >
      {innermostDiv}
    </div>
  );
}

export default renderStaticStrummingGuide;
