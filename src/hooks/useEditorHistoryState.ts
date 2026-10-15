import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import { freeze } from "immer";
import isEqual from "lodash.isequal";
import { createEditorHistory } from "~/utils/createEditorHistory";
import {
  getEditorHistoryInputAction,
  getEditorHistoryShortcut,
} from "~/utils/editorHistoryShortcuts";

/** Isolated history for a dialog draft; resetting/reopening starts a new session. */
export function useEditorHistoryState<T>(
  initialValue: T | (() => T),
  beforeRestore?: () => void,
) {
  const [value, setValue] = useState<T>(() =>
    freeze(
      typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue,
      true,
    ),
  );
  const current = useRef(value);
  const [availability, setAvailability] = useState({
    canUndo: false,
    canRedo: false,
  });
  const [history] = useState(() =>
    createEditorHistory<T>({
      equals: isEqual,
      onChange: setAvailability,
    }),
  );
  const [scopeElement, setScopeElement] = useState<HTMLElement | null>(null);

  const update = useCallback(
    (action: SetStateAction<T>) => {
      const before = current.current;
      const next = freeze(
        typeof action === "function"
          ? (action as (previous: T) => T)(before)
          : action,
        true,
      );
      current.current = next;
      setValue(next);
      history.record(before, next);
    },
    [history],
  );

  const reset = useCallback(
    (next: T) => {
      current.current = freeze(next, true);
      setValue(current.current);
      history.clear();
    },
    [history],
  );

  const undo = useCallback(() => {
    const previous = history.undo(current.current);
    if (previous === undefined) return;
    beforeRestore?.();
    current.current = previous;
    setValue(previous);
  }, [history, beforeRestore]);

  const redo = useCallback(() => {
    const next = history.redo(current.current);
    if (next === undefined) return;
    beforeRestore?.();
    current.current = next;
    setValue(next);
  }, [history, beforeRestore]);

  useEffect(() => {
    if (!scopeElement) return;
    function handleBeforeInput(event: InputEvent) {
      const action = getEditorHistoryInputAction(event.inputType);
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (action === "undo") undo();
      else redo();
    }
    scopeElement.addEventListener("beforeinput", handleBeforeInput, true);
    return () =>
      scopeElement.removeEventListener("beforeinput", handleBeforeInput, true);
  }, [scopeElement, undo, redo]);

  function onKeyDownCapture(event: KeyboardEvent<HTMLElement>) {
    const action = getEditorHistoryShortcut(event.nativeEvent);
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      if (action === "undo") undo();
      else redo();
    } else if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      (event.key.length !== 1 &&
        event.key !== "Backspace" &&
        event.key !== "Delete")
    ) {
      history.breakGroup();
    }
  }

  function onInputCapture(event: FormEvent<HTMLElement>) {
    const inputType = (event.nativeEvent as InputEvent).inputType;
    if (inputType === "insertFromPaste" || inputType === "deleteByCut")
      history.breakGroup();
    else history.groupInput(event.target, inputType);
  }

  return [
    value,
    update,
    {
      ...availability,
      undo,
      redo,
      reset,
      scopeProps: {
        ref: setScopeElement,
        onKeyDownCapture,
        onInputCapture,
        onPointerDownCapture: history.breakGroup,
        onFocusCapture: history.breakGroup,
      },
    },
  ] as const;
}
