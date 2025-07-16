import StaticSectionContainer from "~/components/Tab/Static/StaticSectionContainer";
import { type Section } from "~/stores/TabStore";

interface TabScreenshotPreview {
  tabData: Section[];
  color: string;
  theme: "light" | "dark";
}

function TabScreenshotPreview({ tabData, color, theme }: TabScreenshotPreview) {
  return (
    <div className="baseVertFlex relative mt-4 size-full scroll-m-24 !justify-start gap-4">
      {tabData.map((section, index) => (
        <div key={section.id} className="baseFlex w-full">
          <StaticSectionContainer
            sectionIndex={index}
            sectionData={section}
            color={color}
            theme={theme}
          />
        </div>
      ))}
    </div>
  );
}

export default TabScreenshotPreview;
