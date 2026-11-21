import debounce from "lodash.debounce";
import { useEffect, useRef } from "react";
import { useTabStore, useTabStoreApi } from "~/stores/TabStore";
import {
  compileTabPlayback,
  playbackCompilationInputsChanged,
} from "~/stores/tab/compilation";

/** Imperative compilation keeps document edits out of the host's React subscriptions. */
export default function useAutoCompileChords() {
  const store = useTabStoreApi();
  const editing = useTabStore((state) => state.editing);
  const flush = useRef<(() => void) | null>(null);
  useEffect(() => {
    const run = debounce(() => compileTabPlayback(store), editing ? 1000 : 0);
    flush.current = () => {
      run.flush();
      run.cancel();
    };
    run();
    const unsubscribe = store.subscribe((state, previous) => {
      if (!playbackCompilationInputsChanged(state, previous)) return;
      if (state.playbackSpeed !== previous.playbackSpeed) {
        run.cancel();
        compileTabPlayback(store, true);
      } else {
        run();
      }
    });
    return () => {
      unsubscribe();
      run.cancel();
      flush.current = null;
    };
  }, [editing, store]);

  return () => flush.current?.();
}
