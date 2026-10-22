import { useEffect } from "react";
import { useTabStore, useTabStoreApi } from "~/stores/TabStore";
import { loadCountInBuffer } from "~/utils/audioContextRecovery";

export function useInitializeAudioContext() {
  const store = useTabStoreApi();
  const audioContext = useTabStore((state) => state.audioContext);

  useEffect(() => {
    store.getState().initializeAudioSystem();
  }, [store]);

  useEffect(() => {
    if (!audioContext || audioContext.state === "closed") return;
    void loadCountInBuffer(audioContext)
      .then((countInBuffer) => {
        if (store.getState().audioContext === audioContext)
          store.setState({ countInBuffer });
      })
      .catch((error) => {
        if (
          store.getState().audioContext === audioContext &&
          audioContext.state !== "closed"
        )
          console.error("Error loading count-in audio:", error);
      });
  }, [audioContext, store]);
}
