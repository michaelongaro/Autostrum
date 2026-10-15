import { Redo2, Undo2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTabStore } from "~/stores/TabStore";
import type { HistoryAvailability } from "~/utils/createEditorHistory";

interface EditorHistoryControlsProps extends HistoryAvailability {
  undo: () => void;
  redo: () => void;
  disabled?: boolean;
}

export function EditorHistoryButtons({
  canUndo,
  canRedo,
  undo,
  redo,
  disabled = false,
}: EditorHistoryControlsProps) {
  return (
    <div role="group" aria-label="Edit history" className="baseFlex gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-2 px-2"
        aria-label="Undo"
        aria-keyshortcuts="Control+z Meta+z"
        title="Undo (Ctrl/⌘+Z)"
        disabled={disabled || !canUndo}
        onClick={undo}
      >
        <Undo2 aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Undo</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-2 px-2"
        aria-label="Redo"
        aria-keyshortcuts="Control+Shift+z Meta+Shift+z Control+y"
        title="Redo (Ctrl/⌘+Shift+Z or Ctrl+Y)"
        disabled={disabled || !canRedo}
        onClick={redo}
      >
        <Redo2 aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Redo</span>
      </Button>
    </div>
  );
}

export default function EditorHistoryControls({
  disabled,
}: {
  disabled?: boolean;
}) {
  const history = useTabStore((state) => ({
    canUndo: state.canUndo,
    canRedo: state.canRedo,
    undo: state.undo,
    redo: state.redo,
  }));
  return <EditorHistoryButtons {...history} disabled={disabled} />;
}
