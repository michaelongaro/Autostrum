import ScaleSlider from "~/components/ui/ScaleSlider";

interface TabZoomControlProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onZoomInteractionChange?: (pressing: boolean) => void;
}

export default function TabZoomControl({
  zoom,
  onZoomChange,
  onZoomInteractionChange,
}: TabZoomControlProps) {
  return (
    <ScaleSlider
      label="Zoom"
      value={zoom}
      min={0.5}
      max={1.5}
      step={0.1}
      formatValue={(value) => `${value}x`}
      onChange={onZoomChange}
      onInteractionChange={onZoomInteractionChange}
    />
  );
}
