import { ACCENT_SWATCHES } from "../content";
import { cn } from "~/utils/cn";

type ThemesSectionProps = {
  className?: string;
};

function ThemesSection({ className }: ThemesSectionProps) {
  return (
    <section
      className={cn(
        "baseVertFlex w-full max-w-3xl gap-5 px-4 text-center",
        className,
      )}
    >
      <div className="baseVertFlex gap-3">
        <h2 className="text-2xl font-bold md:text-3xl">Make it yours</h2>
        <p className="text-sm text-foreground/80 md:text-base">
          Light and dark surfaces with maple as the default accent — plus eight
          optional theme colors when you want a different mood.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {ACCENT_SWATCHES.map((swatch) => (
          <div key={swatch.id} className="baseVertFlex gap-2">
            <span
              className={cn(
                "size-10 rounded-full border shadow-sm sm:size-12",
                swatch.id === "maple" && "ring-2 ring-foreground/40 ring-offset-2 ring-offset-background",
              )}
              style={{ backgroundColor: swatch.hex }}
              title={swatch.label}
            />
            <span className="text-xs text-foreground/70">{swatch.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ThemesSection;
