import { useLocalStorageValue } from "@react-hookz/web";
import type { Dispatch, SetStateAction } from "react";
import TabZoomControl from "./TabZoomControl";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";

interface TabSettingsProps {
  showPinnedChords: boolean;
  setShowPinnedChords: (show: boolean) => void;
  setPressingOnZoomSlider?: Dispatch<SetStateAction<boolean>>;
}

function TabSettings({
  showPinnedChords,
  setShowPinnedChords,
  setPressingOnZoomSlider,
}: TabSettingsProps) {
  const localStorageZoom = useLocalStorageValue("autostrum-zoom");
  const localStorageLeftHandChordDiagrams = useLocalStorageValue(
    "autostrum-left-hand-chord-diagrams",
  );
  const localStorageColorCodedChords = useLocalStorageValue(
    "autostrum-color-coded-chords",
  );
  const localStoragePinSectionNavigation = useLocalStorageValue(
    "autostrum-pin-section-navigation",
  );

  const zoom = useGetLocalStorageValues().zoom;
  const leftHandChordDiagrams =
    useGetLocalStorageValues().leftHandChordDiagrams;
  const colorCodedChords = useGetLocalStorageValues().colorCodedChords;
  const pinSectionNavigation = useGetLocalStorageValues().pinSectionNavigation;

  return (
    <div className="baseVertFlex w-full gap-2">
      <TabZoomControl
        zoom={zoom}
        onZoomChange={(value) => localStorageZoom.set(String(value))}
        onZoomInteractionChange={setPressingOnZoomSlider}
      />

      <div className="baseFlex mt-2 w-full !justify-between gap-2">
        <Label htmlFor="pinSectionNavigation">Pin section navigation</Label>
        <Switch
          id="pinSectionNavigation"
          checked={pinSectionNavigation}
          onCheckedChange={(value) =>
            localStoragePinSectionNavigation.set(String(value))
          }
        />
      </div>

      <div className="baseFlex w-full !justify-between gap-2">
        <Label htmlFor="pinChords">Pin chords</Label>
        <Switch
          id="pinChords"
          checked={showPinnedChords}
          onCheckedChange={(value) => {
            setShowPinnedChords(value);
          }}
        />
      </div>

      <div className="baseFlex w-full !justify-between gap-2">
        <Label htmlFor="leftHandChordDiagrams">Left-hand chord diagrams</Label>

        <Switch
          id="leftHandChordDiagrams"
          checked={leftHandChordDiagrams}
          onCheckedChange={(value) =>
            localStorageLeftHandChordDiagrams.set(String(value))
          }
        />
      </div>

      <div className="baseFlex w-full !justify-between gap-2">
        <Label htmlFor="chordDisplayMode">Color-coded chords</Label>

        <Switch
          id="chordDisplayMode"
          checked={colorCodedChords}
          onCheckedChange={(checked) =>
            localStorageColorCodedChords.set(String(checked))
          }
        />
      </div>
    </div>
  );
}

export default TabSettings;
