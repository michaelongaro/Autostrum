import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import ArpeggiatedDownstrumIcon from "~/components/ui/icons/ArpeggiatedDownstrumIcon";
import ArpeggiatedUpstrumIcon from "~/components/ui/icons/ArpeggiatedUpstrumIcon";
import { isArpeggiatedStrum } from "~/utils/strumEffectHelpers";

interface ChordStrumIconProps {
  effects: string;
  className?: string;
  style?: React.CSSProperties;
  /** Pixel size used by most tab/static/playback renderers. */
  size?: number | string;
}

function ChordStrumIcon({
  effects,
  className,
  style,
  size,
}: ChordStrumIconProps) {
  const arpeggiated = isArpeggiatedStrum(effects);
  const accented = effects.includes(">");
  const isDown = effects.includes("v");
  const isUp = effects.includes("^");

  if (!isDown && !isUp) return null;

  const resolvedSize = size ?? (accented ? "18.5px" : "20px");
  const sharedStyle: React.CSSProperties = {
    width: resolvedSize,
    height: resolvedSize,
    ...style,
  };

  if (arpeggiated) {
    const Icon = isDown ? ArpeggiatedDownstrumIcon : ArpeggiatedUpstrumIcon;
    return (
      <Icon
        className={className}
        style={sharedStyle}
        strokeWidth={accented ? 2.25 : 1.75}
      />
    );
  }

  const Icon = isDown ? BsArrowDown : BsArrowUp;
  return (
    <Icon
      className={className}
      style={sharedStyle}
      strokeWidth={accented ? "1.25px" : "0px"}
    />
  );
}

export default ChordStrumIcon;
