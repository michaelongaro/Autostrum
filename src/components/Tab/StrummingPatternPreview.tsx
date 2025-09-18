import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import { type StrummingPattern } from "~/stores/TabStore";

interface StrummingPatternPreview {
  data?: StrummingPattern;
}

function StrummingPatternPreview({ data }: StrummingPatternPreview) {
  if (!data) return null;

  return (
    <div className="baseFlex w-full !justify-start p-1">
      <div
        // TODO: look at alignment when not just v/^
        className="baseFlex !justify-start"
      >
        {data.strums.slice(0, 8).map((strum, strumIndex) => (
          <div key={strumIndex} className="baseFlex">
            <div className="baseVertFlex relative mt-1">
              <div className="baseFlex">
                <div className="w-1"></div>

                {/* only rendering v/^/s to keep preview from getting too large */}
                <div className="baseVertFlex h-full text-lg text-foreground">
                  {strum.strum.includes("v") && (
                    <BsArrowDown className="h-4 w-4" />
                  )}
                  {strum.strum.includes("^") && (
                    <BsArrowUp className="h-4 w-4" />
                  )}

                  {strum.strum.includes("s") && (
                    <div className="baseFlex mb-[5px] h-4 text-[17px] leading-[0]">
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

        {data.strums.length >= 8 && <div>...</div>}
      </div>
    </div>
  );
}

export default StrummingPatternPreview;
