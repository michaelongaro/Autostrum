import { useEffect } from "react";
import Soundfont, { type InstrumentName } from "soundfont-player";
import { useTabStore } from "~/stores/TabStore";
import { isIOS, isSafari } from "react-device-detect";

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
    const fetchInstrument = () => {
      if (!audioContext || !masterVolumeGainNode) return;

      // Check if the instrument is already in cache
      if (instruments[currentInstrumentName]) {
        setCurrentInstrument(instruments[currentInstrumentName]);
        return;
      }

      // If not in cache, fetch it with fallback
      const format = isSafari || isIOS ? "mp3" : "ogg";
      void loadSoundfontWithFallback(
        audioContext,
        currentInstrumentName,
        masterVolumeGainNode,
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
