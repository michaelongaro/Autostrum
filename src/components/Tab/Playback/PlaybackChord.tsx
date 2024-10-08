import { useCallback, useMemo } from "react";
import { useTabStore } from "~/stores/TabStore";
import { BsArrowDown, BsArrowUp, BsPlus } from "react-icons/bs";

import { StrummingPattern } from "~/stores/TabStore";
import { CarouselItem } from "~/components/ui/carousel";

import renderStrummingGuide from "~/utils/renderStrummingGuide";

interface PlaybackChordProps {
  strumIndex: number;
  strum: {
    strum: string;
    palmMute?: string;
  };
  chordName?: string;
  noteLength: string;
  isHighlighted: boolean;
}

function PlaybackChord({
  strumIndex,
  strum,
  chordName = "",
  noteLength,
  isHighlighted,
}: PlaybackChordProps) {
  const heightOfStrummingPatternFiller = "1.5rem";

  function getBeatIndicator(noteLength: string, beatIndex: number) {
    let beat: number | string = "";
    switch (noteLength) {
      case "1/4th":
        beat = beatIndex + 1;
        break;
      case "1/8th":
        beat = beatIndex % 2 === 0 ? beatIndex / 2 + 1 : "&";
        break;
      case "1/16th":
        beat =
          beatIndex % 4 === 0
            ? beatIndex / 4 + 1
            : beatIndex % 2 === 0
              ? "&"
              : "";
        break;
      case "1/4th triplet":
        beat = beatIndex % 3 === 0 ? (beatIndex / 3) * 2 + 1 : "";
        break;
      case "1/8th triplet":
        beat = beatIndex % 3 === 0 ? beatIndex / 3 + 1 : "";
        break;
      case "1/16th triplet":
        beat =
          beatIndex % 3 === 0
            ? (beatIndex / 3) % 2 === 0
              ? beatIndex / 3 / 2 + 1
              : "&"
            : "";
        break;
    }
    return beat.toString();
  }

  return (
    <div className="baseFlex playbackElem">
      <div className="baseVertFlex relative mt-1">
        {strum.palmMute !== "" ? (
          <div></div>
        ) : (
          <div
            style={{
              height: heightOfStrummingPatternFiller,
            }}
            className="h-6"
          ></div>
        )}

        <p
          style={{
            textShadow: isHighlighted
              ? "none"
              : "0 1px 2px hsla(336, 84%, 17%, 0.25)",
            color: isHighlighted ? "hsl(335, 78%, 42%)" : "hsl(324, 77%, 95%)",
          }}
          className="mx-0.5 h-6 text-base font-semibold transition-colors"
        >
          {chordName}
        </p>

        <div className="baseFlex !flex-nowrap">
          <div style={{ width: "0.25rem" }}></div>

          <div
            style={{
              color: isHighlighted
                ? "hsl(335, 78%, 42%)"
                : "hsl(324, 77%, 95%)",
            }}
            className="baseVertFlex relative mb-2 h-[20px] text-lg transition-colors"
          >
            {strum.strum.includes("v") && (
              <BsArrowDown
                style={{
                  width: strum.strum.includes(">") ? "18.5px" : "20px",
                  height: strum.strum.includes(">") ? "18.5px" : "20px",
                }}
                strokeWidth={strum.strum.includes(">") ? "1.25px" : "0px"}
              />
            )}
            {strum.strum.includes("^") && (
              <BsArrowUp
                style={{
                  width: strum.strum.includes(">") ? "18.5px" : "20px",
                  height: strum.strum.includes(">") ? "18.5px" : "20px",
                }}
                strokeWidth={strum.strum.includes(">") ? "1.25px" : "0px"}
              />
            )}

            {strum.strum.includes("s") && (
              <div
                style={{ fontSize: "20px" }}
                className={`baseFlex mb-1 h-5 leading-[0] ${strum.strum.includes(">") ? "font-semibold" : "font-normal"}`}
              >
                {strum.strum[0]}
              </div>
            )}

            {strum.strum.includes(".") && (
              <div
                style={{ fontSize: "30px" }}
                className="absolute bottom-[-9px]"
              >
                .
              </div>
            )}

            {strum.strum === "" && <div className="h-5 w-4"></div>}
          </div>

          <div style={{ width: "0.25rem" }}></div>
        </div>

        <p
          style={{
            textShadow: "none",
            height:
              getBeatIndicator(noteLength, strumIndex) === ""
                ? "1.25rem"
                : "auto",
            color: isHighlighted ? "hsl(335, 78%, 42%)" : "hsl(324, 77%, 95%)",
          }}
          className="text-sm transition-colors"
        >
          {getBeatIndicator(noteLength, strumIndex)}
        </p>

        {renderStrummingGuide(
          noteLength,
          strumIndex,
          "viewingWithChordNames",
          false,
        )}
      </div>
    </div>
  );
}

export default PlaybackChord;
