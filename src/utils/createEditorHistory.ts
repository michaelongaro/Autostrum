export interface HistoryAvailability {
  canUndo: boolean;
  canRedo: boolean;
}

interface EditorHistoryOptions<T> {
  equals?: (a: T, b: T) => boolean;
  onChange: (availability: HistoryAvailability) => void;
  limit?: number;
  now?: () => number;
}

/**
 * Keeps immutable snapshots with structural sharing. Synchronous writes form
 * one action (e.g. removing a chord and its references). Consecutive input
 * events from the same field can also form one typing action.
 */
export function createEditorHistory<T>({
  equals = Object.is,
  onChange,
  limit = 100,
  now = Date.now,
}: EditorHistoryOptions<T>) {
  const past: T[] = [];
  const future: T[] = [];
  let batch: object | null = null;
  let inputGroup: unknown = null;
  let lastInputGroup: unknown = null;
  let inputOperation: string | undefined;
  let lastInputOperation: string | undefined;
  let lastChangeAt = -Infinity;

  function availability(): HistoryAvailability {
    return { canUndo: past.length > 0, canRedo: future.length > 0 };
  }

  function breakGroup() {
    batch = null;
    inputGroup = null;
    lastInputGroup = null;
    inputOperation = undefined;
    lastInputOperation = undefined;
  }

  return {
    availability,
    breakGroup,
    groupInput(group: unknown, operation?: string) {
      inputGroup = group;
      inputOperation = operation;
      // The group applies only to writes dispatched by this input event.
      queueMicrotask(() => {
        if (inputGroup === group) inputGroup = null;
      });
    },
    record(before: T, after: T) {
      if (equals(before, after)) return;

      const changeAt = now();
      if (
        !batch &&
        !(
          inputGroup !== null &&
          inputGroup === lastInputGroup &&
          inputOperation === lastInputOperation &&
          changeAt - lastChangeAt < 1000 &&
          past.length > 0
        )
      ) {
        past.push(before);
        if (past.length > limit) past.shift();
      }

      future.length = 0;
      // A compound action (or typing group) that returns to its starting value
      // should not leave an undo step that visibly does nothing.
      if (past.length > 0 && equals(past[past.length - 1]!, after)) {
        past.pop();
        breakGroup();
        onChange(availability());
        return;
      }
      lastInputGroup = inputGroup;
      lastInputOperation = inputOperation;
      lastChangeAt = changeAt;

      if (!batch) {
        const currentBatch = {};
        batch = currentBatch;
        queueMicrotask(() => {
          if (batch === currentBatch) batch = null;
        });
      }

      onChange(availability());
    },
    undo(current: T): T | undefined {
      breakGroup();
      if (past.length === 0) return;
      const previous = past.pop()!;
      future.push(current);
      onChange(availability());
      return previous;
    },
    redo(current: T): T | undefined {
      breakGroup();
      if (future.length === 0) return;
      const next = future.pop()!;
      past.push(current);
      onChange(availability());
      return next;
    },
    clear() {
      breakGroup();
      past.length = 0;
      future.length = 0;
      onChange(availability());
    },
  };
}
