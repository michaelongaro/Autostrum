import StaticSectionContainer from "~/components/Tab/Static/StaticSectionContainer";
import { type COLORS, type Section } from "~/stores/TabStore";

interface TabScreenshotPreview {
  tabData: Section[];
  color: COLORS;
  theme: "light" | "dark";
}

function TabScreenshotPreview({ tabData, color, theme }: TabScreenshotPreview) {
  return (
    <div className="baseVertFlex relative mt-16 size-full !justify-start gap-4">
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
