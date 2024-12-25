import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import PlaybackPalmMuteNode from "~/components/Tab/Playback/PlaybackPalmMuteNode";
import { getDynamicNoteLengthIcon } from "~/utils/bpmIconRenderingHelpers";

import renderStrummingGuide from "~/utils/renderStrummingGuide";

interface PlaybackStrummedChord {
  strumIndex: number;
  strum: string;
  palmMute?: string;
  chordName?: string;
  noteLength:
    | "1/4th"
    | "1/4th triplet"
    | "1/8th"
    | "1/8th triplet"
    | "1/16th"
    | "1/16th triplet";
  bpmToShow?: number;
  isFirstChordInSection: boolean;
  isLastChordInSection: boolean;
  isHighlighted?: boolean;
  isDimmed: boolean;
  isRaised: boolean;
}

function PlaybackStrummedChord({
  strumIndex,
  strum,
  palmMute,
  chordName = "",
  noteLength,
  bpmToShow,
  isFirstChordInSection,
  isLastChordInSection,
  isHighlighted = false,
  isDimmed,
  isRaised,
}: PlaybackStrummedChord) {
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
    <>
      {/* not my favorite, but strumIndex of -1 indicates a physical spacer between strumming
        patterns and/or tab sections */}
      {strumIndex === -1 && (
        <div
          style={{
            opacity: isDimmed ? 0.5 : 1,
            transition: "opacity 0.5s",
          }}
          className="baseVertFlex ornamental playbackElem mb-[24px] h-[144px] w-4 shrink-0 border-y-2 border-white mobilePortrait:h-[168px]"
        >
          {/* spacer to ease transition from strum -> tab */}
          <div className="my-[10px] h-[1px] w-1/2 self-start bg-gradient-to-r from-pink-100/50 to-transparent mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-start bg-gradient-to-r from-pink-100/50 to-transparent mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-start bg-gradient-to-r from-pink-100/50 to-transparent mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-start bg-gradient-to-r from-pink-100/50 to-transparent mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-start bg-gradient-to-r from-pink-100/50 to-transparent mobilePortrait:my-3"></div>
          <div className="my-[10px] h-[1px] w-1/2 self-start bg-gradient-to-r from-pink-100/50 to-transparent mobilePortrait:my-3"></div>
        </div>
      )}

      {strumIndex !== -1 && (
        <div
          key={`${strumIndex}-${isFirstChordInSection}-${isLastChordInSection}`}
          style={{
            borderLeft: isFirstChordInSection ? "2px solid white" : "none",
            borderRight: isLastChordInSection ? "2px solid white" : "none",
            borderRadius: isFirstChordInSection
              ? "10px 0 0 10px"
              : isLastChordInSection
                ? "0 10px 10px 0"
                : "none",
            borderTop: "2px solid rgb(253 242 248)",
            borderBottom: "2px solid rgb(253 242 248)",
            opacity: isDimmed ? 0.5 : 1,
            transition: "opacity 0.5s",
          }}
          className="baseVertFlex playbackElem relative mb-[24px] h-[144px] w-[40px] pb-4 mobilePortrait:h-[168px]"
        >
          {bpmToShow && (
            <div className="baseFlex absolute -top-7 left-2 gap-1 text-nowrap">
              {getDynamicNoteLengthIcon({
                noteLength,
                forInlineTabViewing: true,
              })}
              <span className="text-xs">{`${bpmToShow} BPM`}</span>
            </div>
          )}

          {palmMute && palmMute !== "" ? (
            <PlaybackPalmMuteNode value={palmMute} />
          ) : (
            <div
              style={{
                height: heightOfStrummingPatternFiller,
              }}
              className="h-6"
            ></div>
          )}

          <div
            style={{
              textShadow: isHighlighted
                ? "none"
                : "0 1px 2px hsla(336, 84%, 17%, 0.25)",
              color: isHighlighted
                ? "hsl(335, 78%, 42%)"
                : "hsl(324, 77%, 95%)",
              // fontSize: calculateFontSize({
              //   chordName,
              //   maxWidthPx: 20,
              //   maxFontSizePx: 16,
              //   minFontSizePx: 12,
              // }),
            }}
            className="relative mb-2 h-6 w-6 text-sm font-semibold transition-colors"
          >
            <div
              // TODO: not sure if this will ever be possible given how it interacts with
              // palm mutes... but the idea is not bad I think.
              // ${isRaised ? "top-[-1rem]" : ""}
              className={`absolute left-1/2 top-0 -translate-x-1/2 transform`}
            >
              {chordName}
            </div>
          </div>

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
              <div className="baseFlex">
                {strum.includes("v") && (
                  <BsArrowDown
                    style={{
                      width: strum.includes(">") ? "18.5px" : "20px",
                      height: strum.includes(">") ? "18.5px" : "20px",
                    }}
                    strokeWidth={strum.includes(">") ? "1.25px" : "0px"}
                  />
                )}
                {strum.includes("^") && (
                  <BsArrowUp
                    style={{
                      width: strum.includes(">") ? "18.5px" : "20px",
                      height: strum.includes(">") ? "18.5px" : "20px",
                    }}
                    strokeWidth={strum.includes(">") ? "1.25px" : "0px"}
                  />
                )}

                {strum.includes("s") && (
                  <div
                    style={{ fontSize: "20px" }}
                    className={`baseFlex mb-1 h-5 leading-[0] ${strum.includes(">") ? "font-semibold" : "font-normal"}`}
                  >
                    {strum[0]}
                  </div>
                )}

                {strum.includes(".") && (
                  <div
                    style={{ fontSize: "30px" }}
                    // className="absolute bottom-[-9px]"
                    className="relative bottom-0 right-1 w-0"
                  >
                    .
                  </div>
                )}
              </div>

              {strum === "" && <div className="h-5 w-4"></div>}
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
              color: isHighlighted
                ? "hsl(335, 78%, 42%)"
                : "hsl(324, 77%, 95%)",
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
      )}
    </>
  );
}

export default PlaybackStrummedChord;

const calculateFontSize = ({
  chordName,
  maxWidthPx,
  maxFontSizePx = 24,
  minFontSizePx = 12,
}: {
  chordName: string;
  maxWidthPx: number;
  maxFontSizePx?: number;
  minFontSizePx?: number;
}) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  // Function to get the width of the chord name in a given font size
  const getTextWidth = (text: string, fontSize: number) => {
    if (!context) {
      throw new Error("Canvas context is not available");
    }

    context.font = `${fontSize}px Arial`; // Using a default font family, not sure if this is the best approach
    return context.measureText(text).width;
  };

  let fontSize = maxFontSizePx;

  // Reduce font size until the chord fits within the max width or hits the minimum font size
  while (
    fontSize > minFontSizePx &&
    getTextWidth(chordName, fontSize) > maxWidthPx
  ) {
    fontSize -= 1; // Reduce font size by 1px on each iteration
  }

  return fontSize;
};
