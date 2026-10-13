import { useEffect } from "react";
import { getTabStore, useTabStore } from "~/stores/TabStore";
import { ensureSoundfontPlayer } from "~/utils/soundfontRuntime";

function useFetchAndLoadSoundfonts() {
  const {
    audioContext,
    masterVolumeGainNode,
    currentInstrumentName,
    instruments,
    setInstruments,
    setCurrentInstrument,
  } = useTabStore((state) => ({
    audioContext: state.audioContext,
    masterVolumeGainNode: state.masterVolumeGainNode,
    currentInstrumentName: state.currentInstrumentName,
    instruments: state.instruments,
    setInstruments: state.setInstruments,
    setCurrentInstrument: state.setCurrentInstrument,
  }));

  useEffect(() => {
    if (!audioContext || !masterVolumeGainNode) return;
    const cached = instruments[currentInstrumentName];
    if (cached) {
      setCurrentInstrument(cached);
      return;
    }
    let cancelled = false;
    setCurrentInstrument(null);
    void ensureSoundfontPlayer(
      audioContext,
      currentInstrumentName,
      masterVolumeGainNode,
    )
      .then((player) => {
        const latest = getTabStore();
        if (
          cancelled ||
          latest.audioContext !== audioContext ||
          latest.currentInstrumentName !== currentInstrumentName
        )
          return;
        setInstruments({
          ...latest.instruments,
          [currentInstrumentName]: player,
        });
        setCurrentInstrument(player);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          console.error(`Failed to load ${currentInstrumentName}:`, error);
      });
    // Slow network responses must not overwrite a more recent instrument choice.
    return () => {
      cancelled = true;
    };
  }, [
    masterVolumeGainNode,
    audioContext,
    currentInstrumentName,
    instruments,
    setCurrentInstrument,
    setInstruments,
  ]);
}

export default useFetchAndLoadSoundfonts;
