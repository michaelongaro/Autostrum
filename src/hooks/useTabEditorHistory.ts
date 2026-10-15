import { useEffect } from "react";
import { getTabStore } from "~/stores/TabStore";
import {
  getEditorHistoryInputAction,
  getEditorHistoryShortcut,
} from "~/utils/editorHistoryShortcuts";

/** One listener for the editor, including its portaled editing controls. */
export function useTabEditorHistory(disabled: boolean) {
  useEffect(() => {
    function isEditorTarget(target: EventTarget | null) {
      if (!(target instanceof Element)) return false;
      if (target.closest("[data-native-undo]")) return false;
      const scope = target.closest("[data-tab-editor-history]");
      if (scope) return true;
      // A shortcut with focus on the page still applies to the editor. Inputs
      // in the header, search, and unrelated dialogs keep their native history.
      return !target.closest(
        "input, textarea, [contenteditable], [role='dialog'], [role='alertdialog']",
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      const state = getTabStore();
      if (!state.editing || !isEditorTarget(event.target)) return;
      if (state.showCustomTuningDialog || state.showSectionProgressionDialog)
        return;

      const action = getEditorHistoryShortcut(event);
      if (action) {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) state[action]();
      } else if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.key.length !== 1 &&
          event.key !== "Backspace" &&
          event.key !== "Delete")
      ) {
        state.breakEditorHistoryGroup();
      }
    }

    function handleInput(event: Event) {
      if (!getTabStore().editing || !isEditorTarget(event.target)) return;
      const inputType = (event as InputEvent).inputType;
      if (inputType === "insertFromPaste" || inputType === "deleteByCut") {
        getTabStore().breakEditorHistoryGroup();
      } else {
        getTabStore().groupEditorHistoryInput(event.target, inputType);
      }
    }

    function handleBeforeInput(event: InputEvent) {
      const action = getEditorHistoryInputAction(event.inputType);
      const state = getTabStore();
      if (!action || !state.editing || !isEditorTarget(event.target)) return;
      if (state.showCustomTuningDialog || state.showSectionProgressionDialog)
        return;
      // Browser Edit-menu actions and mobile undo gestures use beforeinput
      // rather than a keyboard shortcut. They share the same document history.
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) state[action]();
    }

    function breakGroup() {
      getTabStore().breakEditorHistoryGroup();
    }

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("input", handleInput, true);
    window.addEventListener("beforeinput", handleBeforeInput, true);
    window.addEventListener("pointerdown", breakGroup, true);
    window.addEventListener("focusin", breakGroup, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("input", handleInput, true);
      window.removeEventListener("beforeinput", handleBeforeInput, true);
      window.removeEventListener("pointerdown", breakGroup, true);
      window.removeEventListener("focusin", breakGroup, true);
      breakGroup();
    };
  }, [disabled]);
}
