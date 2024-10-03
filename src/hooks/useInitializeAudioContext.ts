import { useEffect } from "react";
import Soundfont from "soundfont-player";
import { useTabStore } from "~/stores/TabStore";
import { isIOS, isSafari } from "react-device-detect";

// An AudioContext is not allowed to be created before a user gesture
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
  }));

  // TODO: this is maybe slightly redundant w/ useFetchAndLoadSoundfonts.ts
  // but we absolutely need to fetch the instrument as soon as AudioContext is available

  useEffect(() => {
    if (audioContext && masterVolumeGainNode) return;

    const handleUserInteraction = () => {
      if (audioContext && masterVolumeGainNode) return;

      const newAudioContext = new AudioContext();

      const newMasterVolumeGainNode = newAudioContext.createGain();

      newMasterVolumeGainNode.connect(newAudioContext.destination);

      setAudioContext(newAudioContext);
      setMasterVolumeGainNode(newMasterVolumeGainNode);

      // Check if the instrument is already in cache
      if (instruments[currentInstrumentName]) {
        setCurrentInstrument(instruments[currentInstrumentName]);
        return;
      }

      setCurrentInstrument(null);

      // If not in cache, fetch it
      setTimeout(
        () => {
          void Soundfont.instrument(newAudioContext, currentInstrumentName, {
            soundfont: "MusyngKite",
            format: isSafari || isIOS ? "mp3" : "ogg", // safari doesn't support .ogg files
            destination: masterVolumeGainNode,
          }).then((player) => {
            // Update the cache
            const updatedInstruments = {
              ...instruments,
              [currentInstrumentName]: player,
            };
            setInstruments(updatedInstruments);
            setCurrentInstrument(player);
          });
        },
        currentInstrument ? 0 : 3000, // want to reduce inital fetching of instrument when app loads
      );

      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };

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
    currentInstrument,
  ]);
}
