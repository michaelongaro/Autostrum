function renderStrummingGuide(
  noteLength: string,
  beatIndex: number,
  mode:
    | "editingStrummingPattern"
    | "editingChordSequence"
    | "viewingWithChordNames"
    | "viewing"
    | "viewingInSelectDropdown"
) {
  let innermostDiv = <div></div>;
  let height = "7px";
  switch (noteLength) {
    case "1/4th":
      height = "6px";
      innermostDiv = (
        <div
          className={`h-full w-[1px] rounded-md ${
            mode === "viewingInSelectDropdown"
              ? "bg-foreground"
              : "bg-background"
          }`}
        ></div>
      );

      break;
    case "1/8th":
      height = "7px";
      innermostDiv = (
        <>
          <div
            className={`h-full w-[1px] rounded-md ${
              mode === "viewingInSelectDropdown"
                ? "bg-foreground"
                : "bg-background"
            }`}
          ></div>

          {beatIndex % 2 === 0 ? (
            <div
              className={`absolute bottom-0 right-0 h-[1px] w-1/2 ${
                mode === "viewingInSelectDropdown"
                  ? "bg-foreground"
                  : "bg-background"
              }`}
            ></div>
          ) : (
            <div
              className={`absolute bottom-0 left-0 right-0 h-[1px] w-1/2 ${
                mode === "viewingInSelectDropdown"
                  ? "bg-foreground"
                  : "bg-background"
              }`}
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
            className={`h-full w-[1px] rounded-md ${
              mode === "viewingInSelectDropdown"
                ? "bg-foreground"
                : "bg-background"
            }`}
          ></div>

          {beatIndex % 2 === 0 ? (
            <>
              <div
                className={`absolute bottom-[2px] right-0 h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
              <div
                className={`absolute bottom-0 right-0 h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
            </>
          ) : (
            <>
              <div
                className={`absolute bottom-[2px] left-0 right-0 h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
              <div
                className={`absolute bottom-0 left-0 right-0 h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
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
            className={`h-[7px] w-[1px] rounded-md ${
              mode === "viewingInSelectDropdown"
                ? "bg-foreground"
                : "bg-background"
            }`}
          ></div>
          {beatIndex % 3 === 1 && (
            <p
              className={`mt-[3px] text-xs ${
                mode === "viewingInSelectDropdown"
                  ? "text-foreground"
                  : "text-background"
              }`}
            >
              3
            </p>
          )}
        </div>
      );

      break;
    case "1/8th triplet":
      height = "25px";

      innermostDiv = (
        <div className="baseVertFlex relative h-full w-full !flex-nowrap !justify-start">
          <div
            className={`h-[7px] w-[1px] rounded-md ${
              mode === "viewingInSelectDropdown"
                ? "bg-foreground"
                : "bg-background"
            }`}
          ></div>
          {beatIndex % 3 === 0 && (
            <>
              <div
                className={`absolute right-0 top-[6px] h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
            </>
          )}

          {beatIndex % 3 === 1 && (
            <>
              <div
                className={`absolute right-0 top-[6px] h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
              <div
                className={`absolute left-0 top-[6px] h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
            </>
          )}

          {beatIndex % 3 === 2 && (
            <>
              <div
                className={`absolute left-0 top-[6px] h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
            </>
          )}

          {beatIndex % 3 === 1 && (
            <p
              className={`mt-[3px] text-xs ${
                mode === "viewingInSelectDropdown"
                  ? "text-foreground"
                  : "text-background"
              }`}
            >
              3
            </p>
          )}
        </div>
      );
      break;
    case "1/16th triplet":
      height = "25px";
      innermostDiv = (
        <div className="baseVertFlex relative h-full w-full !flex-nowrap !justify-start">
          <div
            className={`h-[7px] w-[1px] rounded-md ${
              mode === "viewingInSelectDropdown"
                ? "bg-foreground"
                : "bg-background"
            }`}
          ></div>
          {beatIndex % 3 === 0 && (
            <>
              <div
                className={`absolute right-0 top-[4px] h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
              <div
                className={`absolute right-0 top-[6px] h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
            </>
          )}

          {beatIndex % 3 === 1 && (
            <>
              <div
                className={`absolute right-0 top-[4px] h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
              <div
                className={`absolute right-0 top-[6px] h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
              <div
                className={`absolute left-0 top-[4px] h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
              <div
                className={`absolute left-0 top-[6px] h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
            </>
          )}

          {beatIndex % 3 === 2 && (
            <>
              <div
                className={`absolute left-0 top-[4px] h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
              <div
                className={`absolute left-0 top-[6px] h-[1px] w-1/2 ${
                  mode === "viewingInSelectDropdown"
                    ? "bg-foreground"
                    : "bg-background"
                }`}
              ></div>
            </>
          )}

          {beatIndex % 3 === 1 && (
            <p
              className={`mt-[3px] text-xs ${
                mode === "viewingInSelectDropdown"
                  ? "text-foreground"
                  : "text-background"
              }`}
            >
              3
            </p>
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

export default renderStrummingGuide;
