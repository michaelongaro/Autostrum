import { useLocalStorageValue } from "@react-hookz/web";

function useGetLocalStorageValues() {
  const localStorageVolume = useLocalStorageValue("autostrum-volume", {
    defaultValue: "1",
  });

  const localStorageAutoscroll = useLocalStorageValue("autostrum-autoscroll", {
    defaultValue: "true",
  });

  const localStorageLooping = useLocalStorageValue("autostrum-looping", {
    defaultValue: "false",
  });

  const localStorageZoom = useLocalStorageValue("autostrum-zoom", {
    defaultValue: "1",
  });

  const localStorageLeftHandChordDiagrams = useLocalStorageValue(
    "autostrum-left-hand-chord-diagrams",
    {
      defaultValue: "false",
    },
  );

  return {
    volume: localStorageVolume.value ? Number(localStorageVolume.value) : 1,
    autoscroll: localStorageAutoscroll.value === "true",
    looping: localStorageLooping.value === "true",
    zoom: localStorageZoom.value ? Number(localStorageZoom.value) : 1,
    leftHandChordDiagrams: localStorageLeftHandChordDiagrams.value === "true",
  };
}

export default useGetLocalStorageValues;
