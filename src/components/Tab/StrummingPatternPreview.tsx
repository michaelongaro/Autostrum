import ChordStrumIcon from "~/components/ui/icons/ChordStrumIcon";
import type { StrummingPattern } from "~/stores/TabStore";

interface StrummingPatternPreview {
  data: StrummingPattern;
}

function StrummingPatternPreview({ data }: StrummingPatternPreview) {
  return (
    <div className="baseFlex w-full">
      <div
        style={{
          overflowX: data.strums.length > 8 ? "hidden" : "visible",
        }}
        className="baseFlex !justify-start"
      >
        {data.strums.slice(0, 8).map((strum, strumIndex) => (
          <div key={strumIndex} className="baseFlex">
            <div className="baseVertFlex relative mt-1">
              <div className="baseFlex">
                <div className="w-1"></div>

                {/* only rendering v/^/s to keep preview from getting too large */}
                <div className="baseVertFlex h-full text-lg text-foreground">
                  {(strum.strum.includes("v") || strum.strum.includes("^")) && (
                    <ChordStrumIcon effects={strum.strum} className="h-4 w-4" />
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
