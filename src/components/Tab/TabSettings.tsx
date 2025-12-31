import { useLocalStorageValue } from "@react-hookz/web";
import { getTrackBackground, Range } from "react-range";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { useTabStore } from "~/stores/TabStore";

interface TabSettingsProps {
  showPinnedChords: boolean;
  setShowPinnedChords: (show: boolean) => void;
}

function TabSettings({
  showPinnedChords,
  setShowPinnedChords,
}: TabSettingsProps) {
  const localStorageZoom = useLocalStorageValue("autostrum-zoom");
  const localStorageLeftHandChordDiagrams = useLocalStorageValue(
    "autostrum-left-hand-chord-diagrams",
  );

  const { chordDisplayMode, setChordDisplayMode } = useTabStore((state) => ({
    chordDisplayMode: state.chordDisplayMode,
    setChordDisplayMode: state.setChordDisplayMode,
  }));

  const zoom = useGetLocalStorageValues().zoom;
  const leftHandChordDiagrams =
    useGetLocalStorageValues().leftHandChordDiagrams;

  // used for range marking conditional background color
  const indexToZoom = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5];

  return (
    <div className="baseVertFlex w-full gap-2">
      <div className="baseFlex w-full !justify-between gap-2 text-sm font-medium">
        <Label id="tabZoomSlider">Zoom</Label>
        <span>{zoom}x</span>
      </div>

      <div className="baseFlex w-full">
        <Range
          labelledBy="tabZoomSlider"
          step={0.1}
          min={0.5}
          max={1.5}
          values={[zoom]}
          renderMark={({ props, index }) => (
            <div
              {...props}
              key={props.key}
              style={{
                ...props.style,
                marginTop: "0px",
                height: "12px",
                width: "2px",
                borderRadius: "25%",
                backgroundColor:
                  indexToZoom[index]! <= zoom
                    ? "hsl(var(--primary))"
                    : "#939098",
              }}
            />
          )}
          onChange={(values) => {
            localStorageZoom.set(`${values[0]}`);
          }}
          renderTrack={({ props, children, disabled }) => (
            <div
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              style={{
                ...props.style,
                display: "flex",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <div
                ref={props.ref}
                style={{
                  height: "8px",
                  borderRadius: "0px",
                  filter: disabled ? "brightness(0.75)" : "none",
                  background: getTrackBackground({
                    values: [zoom],
                    colors: ["hsl(var(--primary))", "#939098"],
                    min: 0.5,
                    max: 1.5,
                  }),
                  alignSelf: "center",
                }}
                className="w-full"
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props, index }) => (
            <div
              {...props}
              key={`${props.key}-${index}`}
              style={{
                ...props.style,
              }}
              className="z-10 size-[18px] rounded-full border border-foreground/50 bg-primary"
            />
          )}
        />
      </div>

      <div className="baseFlex w-full !justify-between gap-2 text-xs font-medium">
        <span>0.5x</span>
        <span>1x</span>
        <span>1.5x</span>
      </div>

      <div className="baseFlex mt-2 w-full !justify-between gap-2">
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
          checked={chordDisplayMode === "color"}
          onCheckedChange={(checked) =>
            setChordDisplayMode(checked ? "color" : "text")
          }
        />
      </div>
    </div>
  );
}

export default TabSettings;
