import { useEffect } from "react";
import Soundfont from "soundfont-player";
import { shallow } from "zustand/shallow";
import { useTabStore } from "~/stores/TabStore";

function useFetchAndLoadSoundfonts() {
  const {
    audioContext,
    masterVolumeGainNode,
    currentInstrumentName,
    instruments,
    setInstruments,
    currentInstrument,
    setCurrentInstrument,
  } = useTabStore(
    (state) => ({
      audioContext: state.audioContext,
      masterVolumeGainNode: state.masterVolumeGainNode,
      currentInstrumentName: state.currentInstrumentName,
      instruments: state.instruments,
      setInstruments: state.setInstruments,
      currentInstrument: state.currentInstrument,
      setCurrentInstrument: state.setCurrentInstrument,
    }),
    shallow
  );

  // even though browser will cache network request to soundfont file,
  // the soundfont player will still need to parse the file and create the instrument
  // which is why we store intruments in their own "cache" object in the store.
  useEffect(() => {
    const fetchInstrument = () => {
      if (!audioContext) return;

      // Check if the instrument is already in cache
      if (instruments[currentInstrumentName]) {
        setCurrentInstrument(instruments[currentInstrumentName]);
        return;
      }

      setCurrentInstrument(null);

      // If not in cache, fetch it
      setTimeout(
        () => {
          void Soundfont.instrument(audioContext, currentInstrumentName, {
            soundfont: "MusyngKite",
            format: "ogg",
          }).then((player) => {
            player.connect(masterVolumeGainNode);

            // Update the cache
            const updatedInstruments = {
              ...instruments,
              [currentInstrumentName]: player,
            };
            setInstruments(updatedInstruments);
            setCurrentInstrument(player);
          });
        },
        currentInstrument ? 0 : 1500
      );
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
