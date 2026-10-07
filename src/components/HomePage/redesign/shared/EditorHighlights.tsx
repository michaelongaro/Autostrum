import { EDITOR_SHORTCUTS } from "../content";
import EditorFrame from "./mocks/EditorFrame";
import { cn } from "~/utils/cn";

type EditorHighlightsProps = {
  className?: string;
  showFrame?: boolean;
};

function EditorHighlights({
  className,
  showFrame = true,
}: EditorHighlightsProps) {
  return (
    <section
      className={cn(
        "baseVertFlex w-full max-w-6xl gap-8 px-4 md:gap-10",
        className,
      )}
    >
      <div className="baseVertFlex max-w-2xl gap-3 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">
          Built for keyboard-first tab writing
        </h2>
        <p className="text-sm text-foreground/80 md:text-base">
          Named chords with diagrams, strumming patterns, section progression,
          and shortcuts that keep your hands on the fretboard — and the keys.
        </p>
      </div>

      <div className="baseFlex w-full flex-wrap gap-2 md:gap-3">
        {EDITOR_SHORTCUTS.map((shortcut) => (
          <div
            key={shortcut.keys}
            className="baseFlex gap-2 rounded-md border bg-background/80 px-3 py-2 text-sm shadow-sm"
          >
            <kbd className="!bg-secondary !text-foreground">{shortcut.keys}</kbd>
            <span className="text-foreground/75">{shortcut.label}</span>
          </div>
        ))}
      </div>

      {showFrame && <EditorFrame className="w-full max-w-4xl" />}
    </section>
  );
}

export default EditorHighlights;
