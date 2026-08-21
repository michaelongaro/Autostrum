import { getTrackBackground, Range } from "react-range";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import Ellipsis from "~/components/ui/icons/Ellipsis";
import ChordStrumIcon from "~/components/ui/icons/ChordStrumIcon";
import PlayIcon from "~/components/ui/icons/PlayIcon";
import {
  calculateAutomaticStrumSpreadSeconds,
  formatStrumSpreadDisplay,
  getStrumDisplayName,
  getStrumSpreadBounds,
  getStrumSpreadMarkValues,
  isArpeggiatedStrum,
  remapStrumSpreadForType,
} from "~/utils/strumEffectHelpers";

interface StrumSettingsDropdownProps {
  effects: string;
  bpm: number;
  strumSpreadAuto?: boolean;
  strumSpreadSeconds?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStrumSpreadAutoChange: (auto: boolean) => void;
  onStrumSpreadSecondsChange: (seconds: number) => void;
  onPreview: () => void;
  previewDisabled?: boolean;
  triggerClassName?: string;
}

function StrumSettingsDropdown({
  effects,
  bpm,
  strumSpreadAuto = true,
  strumSpreadSeconds = null,
  open,
  onOpenChange,
  onStrumSpreadAutoChange,
  onStrumSpreadSecondsChange,
  onPreview,
  previewDisabled = false,
  triggerClassName = "my-1 h-2.5 w-5 !p-1 hover:!bg-primary hover:!text-primary-foreground",
}: StrumSettingsDropdownProps) {
  const arpeggiated = isArpeggiatedStrum(effects);
  const { min, max } = getStrumSpreadBounds(arpeggiated);
  const strumQuickly = effects.includes(">") || effects.includes(".");
  const autoValue = calculateAutomaticStrumSpreadSeconds(
    bpm,
    arpeggiated,
    strumQuickly,
  );
  const displayValue = strumSpreadAuto
    ? autoValue
    : remapStrumSpreadForType(strumSpreadSeconds ?? autoValue, arpeggiated);
  const markValues = getStrumSpreadMarkValues(arpeggiated);
  const step = 0.01;

  function handleDurationInputChange(raw: string) {
    const parsed = Number.parseFloat(raw.replace(/s$/i, ""));
    if (!Number.isFinite(parsed)) return;
    onStrumSpreadAutoChange(false);
    onStrumSpreadSecondsChange(remapStrumSpreadForType(parsed, arpeggiated));
  }

  return (
    <DropdownMenu modal={true} open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={triggerClassName}>
          <Ellipsis className="h-3 w-4 rotate-90" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        className="baseVertFlex w-[280px] gap-3 p-3"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="baseFlex w-full !justify-between gap-2">
          <div className="baseFlex gap-2">
            <ChordStrumIcon effects={effects} size="18px" />
            <span className="text-sm font-medium leading-tight">
              {getStrumDisplayName(effects)}
            </span>
          </div>
          <Input
            type="text"
            inputMode="decimal"
            disabled={strumSpreadAuto}
            value={formatStrumSpreadDisplay(displayValue)}
            onChange={(e) => handleDurationInputChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="h-8 w-[72px] px-2 text-center text-sm"
            aria-label="Strum duration"
          />
        </div>

        <div className="baseVertFlex w-full !items-start px-1 pt-1">
          <div className="mb-2 text-xs font-medium">Strum duration</div>
          <Range
            label="Strum duration"
            labelledBy="strum-duration"
            step={step}
            min={min}
            max={max}
            values={[displayValue]}
            disabled={strumSpreadAuto}
            onChange={(values) => {
              const next = values[0];
              if (next === undefined) return;
              onStrumSpreadAutoChange(false);
              onStrumSpreadSecondsChange(
                remapStrumSpreadForType(next, arpeggiated),
              );
            }}
            renderMark={({ props, index }) => {
              const markValue = Number((min + index * step).toFixed(2));
              if (!markValues.some((v) => Math.abs(v - markValue) < 0.001)) {
                return null;
              }
              return (
                <div
                  {...props}
                  key={props.key}
                  className="h-2 w-[2px] rounded-full bg-foreground/40"
                />
              );
            }}
            renderTrack={({ props, children }) => (
              <div
                onMouseDown={props.onMouseDown}
                onTouchStart={props.onTouchStart}
                style={{
                  ...props.style,
                  display: "flex",
                  width: "100%",
                  opacity: strumSpreadAuto ? 0.55 : 1,
                }}
              >
                <div
                  ref={props.ref}
                  style={{
                    height: "8px",
                    width: "100%",

                    background: getTrackBackground({
                      values: [displayValue],
                      colors: ["hsl(var(--primary))", "hsl(var(--gray) / 0.5)"],
                      min,
                      max,
                    }),
                    alignSelf: "center",
                  }}
                >
                  {children}
                </div>
              </div>
            )}
            renderThumb={({ props }) => (
              <div
                {...props}
                key={props.key}
                className="z-10 size-[16px] rounded-full border border-foreground/50 bg-primary"
              />
            )}
          />
          <div className="baseFlex mt-1 w-full !justify-between text-[10px] text-foreground/60">
            <span>{formatStrumSpreadDisplay(min)}</span>
            <span>{formatStrumSpreadDisplay(max)}</span>
          </div>
        </div>

        <div className="baseFlex w-full !justify-between gap-2">
          <div className="baseFlex gap-2">
            <Switch
              id="strum-spread-auto"
              checked={strumSpreadAuto}
              onCheckedChange={(checked) => {
                onStrumSpreadAutoChange(checked);
                if (!checked) {
                  onStrumSpreadSecondsChange(autoValue);
                }
              }}
            />
            <Label htmlFor="strum-spread-auto" className="text-sm">
              Auto
            </Label>
          </div>
          <Button
            variant="audio"
            size="sm"
            disabled={previewDisabled}
            className="baseFlex h-8 gap-1.5 px-3"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPreview();
            }}
          >
            <PlayIcon className="size-3.5" />
            Preview
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default StrumSettingsDropdown;
