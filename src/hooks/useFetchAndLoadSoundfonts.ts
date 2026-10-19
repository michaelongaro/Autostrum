import { useEffect } from "react";
import { useTabStore, useTabStoreApi } from "~/stores/TabStore";
import { ensureSoundfontPlayer } from "~/utils/soundfontRuntime";

function useFetchAndLoadSoundfonts() {
  const store = useTabStoreApi();
  const { audioContext, masterVolumeGainNode, currentInstrumentName } =
    useTabStore((state) => ({
      audioContext: state.audioContext,
      masterVolumeGainNode: state.masterVolumeGainNode,
      currentInstrumentName: state.currentInstrumentName,
    }));

  useEffect(() => {
    if (
      !audioContext ||
      !masterVolumeGainNode ||
      audioContext.state === "closed"
    )
      return;

    const cached = store.getState().instruments[currentInstrumentName];
    if (cached) {
      store.setState({ currentInstrument: cached });
      return;
    }

    store.setState({ currentInstrument: null });
    void ensureSoundfontPlayer(
      audioContext,
      currentInstrumentName,
      masterVolumeGainNode,
    )
      .then((player) => {
        const latest = store.getState();
        // A replaced context's players cannot connect to the new audio graph.
        if (latest.audioContext !== audioContext) return;
        store.setState({
          instruments: {
            ...latest.instruments,
            [currentInstrumentName]: player,
          },
          ...(latest.currentInstrumentName === currentInstrumentName && {
            currentInstrument: player,
          }),
        });
      })
      .catch((error) => {
        console.error(`Failed to load ${currentInstrumentName}:`, error);
      });
  }, [audioContext, masterVolumeGainNode, currentInstrumentName, store]);
}

export default useFetchAndLoadSoundfonts;
