import { useEffect } from "react";
import { getTabStoreState, useTabStore } from "~/stores/TabStore";
import {
  createAudioGraph,
  loadCountInBuffer,
} from "~/utils/audioContextRuntime";
import { ensureSoundfontPlayer } from "~/utils/soundfontRuntime";

export function useInitializeAudioContext() {
  const {
    audioContext,
    setAudioContext,
    masterVolumeGainNode,
    setMasterVolumeGainNode,
    setCurrentInstrument,
    instruments,
    currentInstrumentName,
    setInstruments,
    setCountInBuffer,
  } = useTabStore((state) => ({
    audioContext: state.audioContext,
    setAudioContext: state.setAudioContext,
    masterVolumeGainNode: state.masterVolumeGainNode,
    setMasterVolumeGainNode: state.setMasterVolumeGainNode,
    setCurrentInstrument: state.setCurrentInstrument,
    instruments: state.instruments,
    currentInstrumentName: state.currentInstrumentName,
    setInstruments: state.setInstruments,
    setCountInBuffer: state.setCountInBuffer,
  }));

  useEffect(() => {
    if (audioContext && masterVolumeGainNode) return;

    function handleUserInteraction() {
      const latestState = getTabStoreState();
      if (latestState.audioContext && latestState.masterVolumeGainNode) {
        return;
      }

      const { audioContext: newAudioContext, masterVolumeGainNode: newMasterVolumeGainNode } =
        createAudioGraph();

      setAudioContext(newAudioContext);
      setMasterVolumeGainNode(newMasterVolumeGainNode);

      // Check if the instrument is already in cache
      if (instruments[currentInstrumentName]) {
        setCurrentInstrument(instruments[currentInstrumentName]);
        return;
      }

      void ensureSoundfontPlayer(
        newAudioContext,
        currentInstrumentName,
        newMasterVolumeGainNode,
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

      loadCountInBuffer(newAudioContext)
        .then((audioBuffer) => {
          setCountInBuffer(audioBuffer);
        })
        .catch((error) => {
          console.error("Error fetching count-in audio file:", error);
        });
    }

    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("keydown", handleUserInteraction);

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };
  }, [
    audioContext,
    masterVolumeGainNode,
    setAudioContext,
    setMasterVolumeGainNode,
    setCurrentInstrument,
    instruments,
    currentInstrumentName,
    setInstruments,
    setCountInBuffer,
  ]);
}
