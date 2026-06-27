import { useEffect } from "react";
import { useTabStore } from "~/stores/TabStore";
import { ensureSoundfontPlayer } from "~/utils/soundfontRuntime";

function useFetchAndLoadSoundfonts() {
  const {
    audioContext,
    masterVolumeGainNode,
    currentInstrumentName,
    instruments,
    setInstruments,
    currentInstrument,
    setCurrentInstrument,
  } = useTabStore((state) => ({
    audioContext: state.audioContext,
    masterVolumeGainNode: state.masterVolumeGainNode,
    currentInstrumentName: state.currentInstrumentName,
    instruments: state.instruments,
    setInstruments: state.setInstruments,
    currentInstrument: state.currentInstrument,
    setCurrentInstrument: state.setCurrentInstrument,
  }));

  useEffect(() => {
    const fetchInstrument = () => {
      if (!audioContext || !masterVolumeGainNode) return;

      // Check if the instrument is already in cache
      if (instruments[currentInstrumentName]) {
        setCurrentInstrument(instruments[currentInstrumentName]);
        return;
      }

      void ensureSoundfontPlayer(
        audioContext,
        currentInstrumentName,
        masterVolumeGainNode,
      )
        .then((player) => {
          // Update the cache
          const updatedInstruments = {
            ...instruments,
            [currentInstrumentName]: player,
          };
          setInstruments(updatedInstruments);
          setCurrentInstrument(player);
        })
        .catch((error) => {
          console.error(
            `Failed to load ${currentInstrumentName} from both sources:`,
            error,
          );
        });
    };

    void fetchInstrument();
  }, [
    masterVolumeGainNode,
    audioContext,
    currentInstrumentName,
    instruments,
    currentInstrument,
    setCurrentInstrument,
    setInstruments,
  ]);
}

export default useFetchAndLoadSoundfonts;
