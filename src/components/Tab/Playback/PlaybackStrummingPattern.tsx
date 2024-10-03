import { useCallback, useMemo } from "react";
import { useTabStore } from "~/stores/TabStore";
import { BsArrowDown, BsArrowUp, BsPlus } from "react-icons/bs";

import type { PlaybackStrummingPattern as StrummingPatternType } from "~/utils/experimentalChordCompilationHelpers";
import renderStrummingGuide from "~/utils/renderStrummingGuide";
import { CarouselItem } from "~/components/ui/carousel";

interface PlaybackStrummingPattern {
  indices: number[];
   data: StrummingPatternType;
  chordSequenceData?: string[];
  currentChordIndex: number;

}

function PlaybackStrummingPattern(
{ indices, data, chordSequenceData, currentChordIndex }: PlaybackStrummingPattern
) {



  const patternHasPalmMuting = useCallback(() => {
    return data.strums.some((strum) => strum.palmMute !== "");
  }, [data]);

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

  function highlightChord(chordIndex: number) {
    return currentChordIndex >= chordIndex;
  }


  return (
    <div className="baseFlex px-4">

{data?.strums?.map((strum, strumIndex) => (
          <div
            key={strumIndex}
            
            // name={`section${sectionIndex ?? ""}-subSection${
            //   subSectionIndex ?? ""
            // }-chordSequence${chordSequenceIndex ?? ""}-chord${strumIndex}`}
            // id={`section${sectionIndex ?? ""}-subSection${
            //   subSectionIndex ?? ""
            // }-chordSequence${chordSequenceIndex ?? ""}-chord${strumIndex}`}
            className="baseFlex playbackChord"
          >
            <div
              style={{
                marginTop:
                  "0.25rem",
               
              }}
              className="baseVertFlex relative mt-1"
            >
              {strum.palmMute !== "" ? (
                // <StrummingPatternPalmMuteNode
                //   value={strum.palmMute}
                //   beatIndex={strumIndex}
                //   strummingPatternBeingEdited={{
                //     index: index ?? 0,
                //     value: data,
                //   }}
                //   opacity={pmNodeOpacities[strumIndex] ?? "1"}
                //   editingPalmMuteNodes={editingPalmMuteNodes!}
                //   setEditingPalmMuteNodes={setEditingPalmMuteNodes!}
                //   lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                //   setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
                //   darkMode={
                //     mode === "viewingInSelectDropdown" &&
                //     !isBeingHighlightedInDropdown
                //   }
                //   viewingInSelectDropdown={mode === "viewingInSelectDropdown"}
                //   editing={mode === "editingStrummingPattern"}
                // />
                <div></div>
                // TODO ^ 
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
                          textShadow: highlightChord(
                            strumIndex,
                      
                          )
                            ? "none"
                            : "0 1px 2px hsla(336, 84%, 17%, 0.25)",
                          color: highlightChord(indices[strumIndex]!)
                            ? "hsl(335, 78%, 42%)"
                            : "hsl(324, 77%, 95%)",
                        }}
                        className="mx-0.5 h-6 text-base font-semibold transition-colors"
                      >
                        {chordSequenceData?.[strumIndex]}
                      </p>
                 

              <div className="baseFlex !flex-nowrap">
                <div
                  style={{
                    width:
                     "0.25rem",
                  }}
                ></div>
                {/* spacer so that PM nodes can be connected seamlessly above */}

            
                  <div
                    style={{
                      color:
                         highlightChord(indices[strumIndex]!)
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
                        strokeWidth={
                          strum.strum.includes(">") ? "1.25px" : "0px"
                        }
                      />
                    )}
                    {strum.strum.includes("^") && (
                      <BsArrowUp
                        style={{
                          width: strum.strum.includes(">") ? "18.5px" : "20px",
                          height: strum.strum.includes(">") ? "18.5px" : "20px",
                        }}
                        strokeWidth={
                          strum.strum.includes(">") ? "1.25px" : "0px"
                        }
                      />
                    )}

                    {strum.strum.includes("s") && (
                      <div
                        style={{
                          fontSize: "20px",
                        }}
                        className={`baseFlex mb-1 h-5 leading-[0] ${
                          strum.strum.includes(">")
                            ? "font-semibold"
                            : "font-normal"
                        }`}
                      >
                        {strum.strum[0]}
                      </div>
                    )}

                    {strum.strum.includes(".") && (
                      <div
                        style={{
                          fontSize: "30px",
                        }}
                        className="absolute bottom-[-9px]"
                      >
                        .
                      </div>
                    )}

                    {strum.strum === "" && <div className="h-5 w-4"></div>}
                  </div>
                

                <div
                  style={{
                    width:
                     "0.25rem",
                  }}
                ></div>
                {/* spacer so that PM nodes can be connected seamlessly above */}
              </div>

              {/* beat indicator */}
              <p
                style={{
                  textShadow: "none",
                  height:
                    getBeatIndicator(data.noteLength, strumIndex) === ""
                      ? "1.25rem"
                      : "auto",
                  color:
                    highlightChord(indices[strumIndex]!)
                      ? "hsl(335, 78%, 42%)"
                      : "hsl(324, 77%, 95%)",
                }}
                className="text-sm transition-colors"
              >
                {getBeatIndicator(data.noteLength, strumIndex)}
              </p>

              {/* strumming guide */}
              {renderStrummingGuide(
                data.noteLength,
                strumIndex,
                "viewingWithChordNames",
                false
              )}


            </div>

          </div>
        ))}
      </div>
  )

}

export default PlaybackStrummingPattern;