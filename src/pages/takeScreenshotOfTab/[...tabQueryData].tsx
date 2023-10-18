import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import TabPreview from "~/components/Tab/TabPreview";
import { type Section } from "~/stores/TabStore";

function ScreenshotReadyTab() {
  const { query } = useRouter();

  const [tuning, setTuning] = useState<string>();
  const [baselineBpm, setBaselineBpm] = useState<number>();
  const [tabData, setTabData] = useState<Section[]>();

  useEffect(() => {
    const bubblesBackground = document.getElementById(
      "mainFloatingBubblesBackground"
    );

    if (Object.keys(query).length === 0 || !bubblesBackground) return;

    bubblesBackground.style.display = "none";

    const { tuning, baselineBpm } = query;

    console.log(tuning, baselineBpm);

    // definitely aware that this is a react antipattern, but didn't want to go through
    // too many extra hoops with basically posting tab and then fetching it again
    // to take screenshot + upload screenshot url, etc...
    const tabData = window.myInjectedData;

    setTuning(decodeURIComponent(tuning as string));
    setBaselineBpm(parseInt(baselineBpm as string));
    setTabData(JSON.parse(tabData as string) as Section[]);
  }, [query]);

  if (!tuning || !baselineBpm || !tabData) return null;

  return (
    <div className="baseVertFlex min-h-[100vh] w-full !justify-start">
      <div className="baseVertFlex lightGlassmorphic relative my-12 min-h-[100vh] w-11/12 !justify-start gap-4 rounded-md md:my-24 xl:w-8/12">
        <TabPreview
          baselineBpm={baselineBpm}
          tuning={tuning}
          tabData={tabData}
        />
      </div>
    </div>
  );
}

export default ScreenshotReadyTab;
