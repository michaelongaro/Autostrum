import { BiDownArrowAlt, BiUpArrowAlt } from "react-icons/bi";
import { type StrummingPattern } from "~/stores/TabStore";

interface StrummingPatternPreview {
  data: StrummingPattern;
}

function StrummingPatternPreview({ data }: StrummingPatternPreview) {
  return (
    <div className="baseFlex w-full !justify-start p-1">
      <div
        // TODO: look at alignment when not just v/^
        className="baseFlex !justify-start"
      >
        {data.strums.slice(0, 8).map((strum, strumIndex) => (
          <div key={strumIndex} className="baseFlex">
            <div className="baseVertFlex relative mt-1">
              <div className="baseFlex !flex-nowrap">
                <div className="w-1"></div>

                {/* only rendering v/^/s to keep preview from getting too large */}
                <div className="baseVertFlex h-full text-lg text-background">
                  {strum.strum.includes("v") && (
                    <BiDownArrowAlt className="h-5 w-5" />
                  )}
                  {strum.strum.includes("^") && (
                    <BiUpArrowAlt className="h-5 w-5" />
                  )}

                  {strum.strum.includes("s") && (
                    <div className="baseFlex h-5 leading-[0]">
                      {strum.strum[0]}
                    </div>
                  )}
                  {strum.strum === "" && <div className="h-6 w-4"></div>}
                </div>

                <div className="w-1"></div>
              </div>
            </div>
          </div>
        ))}
        {/* conditional "+" button to extend pattern if not at max length */}
        {data.strums.length >= 8 && <div>...</div>}
      </div>
    </div>
  );
}

export default StrummingPatternPreview;
