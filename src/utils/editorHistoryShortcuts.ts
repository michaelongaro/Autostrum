export function getEditorHistoryShortcut(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  isComposing?: boolean;
}): "undo" | "redo" | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.isComposing) {
    return null;
  }
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && !event.shiftKey) return "redo";
  return null;
}

export function getEditorHistoryInputAction(inputType: string) {
  if (inputType === "historyUndo") return "undo";
  if (inputType === "historyRedo") return "redo";
  return null;
}
