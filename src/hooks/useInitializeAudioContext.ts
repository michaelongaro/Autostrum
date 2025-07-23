import { useEffect } from "react";
import Soundfont, { type InstrumentName } from "soundfont-player";
import { useTabStore } from "~/stores/TabStore";
import { isIOS, isSafari, isMobileOnly } from "react-device-detect";

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

  // FYI: this is maybe slightly redundant w/ useFetchAndLoadSoundfonts.ts
  // but we absolutely need to fetch the instrument as soon as AudioContext is available

  // Helper function to load soundfont with fallback
  const loadSoundfontWithFallback = async (
    audioContext: AudioContext,
    instrumentName: InstrumentName,
    destination: GainNode,
    format: string,
  ) => {
    try {
      // Try external CDN first
      return await Soundfont.instrument(audioContext, instrumentName, {
        soundfont: "MusyngKite",
        format: format,
        destination: destination,
      });
    } catch (error) {
      console.warn(
        `CDN failed for ${instrumentName}, trying local files...`,
        error,
      );
      try {
        // Fallback to local files
        return await Soundfont.instrument(audioContext, instrumentName, {
          soundfont: "MusyngKite",
          format: format,
          destination: destination,
          nameToUrl: (name: string, soundfont: string, format: string) => {
            return `/sounds/instruments/${name}-${format}.js`;
          },
        });
      } catch (localError) {
        console.error(
          `Both CDN and local loading failed for ${instrumentName}:`,
          localError,
        );
        throw localError;
      }
    }
  };

  useEffect(() => {
    if (audioContext && masterVolumeGainNode) return;

    function handleUserInteraction() {
      if (audioContext && masterVolumeGainNode) return;

      const newAudioContext = new AudioContext();
      void newAudioContext.resume(); // Resume the context to ensure it is active (iOS safari requirement)

      const newMasterVolumeGainNode = newAudioContext.createGain();

      if (isMobileOnly) {
        // mobile doesn't get access to a volume slider (users expect to use device's volume directly) so initializing at full volume.
        newMasterVolumeGainNode.gain.value = 2;
        localStorage.setItem("autostrum-volume", "2");
      }

      newMasterVolumeGainNode.connect(newAudioContext.destination);

      setAudioContext(newAudioContext);
      setMasterVolumeGainNode(newMasterVolumeGainNode);

      // Check if the instrument is already in cache
      if (instruments[currentInstrumentName]) {
        setCurrentInstrument(instruments[currentInstrumentName]);
        return;
      }

      // If not in cache, fetch it with fallback
      const format = isSafari || isIOS ? "mp3" : "ogg"; // safari doesn't support .ogg files

      void loadSoundfontWithFallback(
        newAudioContext,
        currentInstrumentName,
        newMasterVolumeGainNode,
        format,
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
    currentInstrument,
    setCountInBuffer,
  ]);
}
