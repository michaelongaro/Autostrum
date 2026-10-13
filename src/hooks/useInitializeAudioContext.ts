import { useEffect } from "react";
import { useTabStore } from "~/stores/TabStore";
import { isMobileOnly } from "react-device-detect";

export function useInitializeAudioContext() {
  const {
    audioContext,
    setAudioContext,
    masterVolumeGainNode,
    setMasterVolumeGainNode,
    setCountInBuffer,
  } = useTabStore((state) => ({
    audioContext: state.audioContext,
    setAudioContext: state.setAudioContext,
    masterVolumeGainNode: state.masterVolumeGainNode,
    setMasterVolumeGainNode: state.setMasterVolumeGainNode,
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

    // useFetchAndLoadSoundfonts owns selection/loading once this context is set.

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
    setCountInBuffer,
  ]);
}
