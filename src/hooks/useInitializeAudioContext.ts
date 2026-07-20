import { useEffect } from "react";
import { useTabStore } from "~/stores/TabStore";
import { isMobileOnly } from "react-device-detect";
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
    currentInstrument,
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
    currentInstrument: state.currentInstrument,
    setCountInBuffer: state.setCountInBuffer,
  }));

  useEffect(() => {
    if (audioContext && masterVolumeGainNode) return;

    const newAudioContext = new AudioContext();

    const newMasterVolumeGainNode = newAudioContext.createGain();

    if (isMobileOnly) {
      // mobile doesn't get access to a volume slider (users expect to use device's volume directly) so initializing at full volume.
      newMasterVolumeGainNode.gain.value = 1.25;
      localStorage.setItem("autostrum-volume", "1.25");
    }

    newMasterVolumeGainNode.connect(newAudioContext.destination);

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

    async function fetchAudioFile(path: string) {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      return await newAudioContext.decodeAudioData(arrayBuffer);
    }

    fetchAudioFile("/sounds/countIn.wav")
      .then((audioBuffer) => {
        setCountInBuffer(audioBuffer);
      })
      .catch((error) => {
        console.error("Error fetching count-in audio file:", error);
      });
  }, [
    audioContext,
    masterVolumeGainNode,
    setAudioContext,
    setMasterVolumeGainNode,
    setCurrentInstrument,
    instruments,
    currentInstrumentName,
    setInstruments,
    currentInstrument,
    setCountInBuffer,
  ]);
}
