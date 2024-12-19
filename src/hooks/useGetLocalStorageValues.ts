import { useLocalStorageValue } from "@react-hookz/web";

function useGetLocalStorageValues() {
  const localStorageVolume = useLocalStorageValue("autostrumVolume", {
    defaultValue: "1",
    initializeWithValue: false,
  });

  const localStorageAutoscroll = useLocalStorageValue("autostrumAutoscroll", {
    defaultValue: "true",
    initializeWithValue: false,
  });

  const localStorageLooping = useLocalStorageValue("autostrumLooping", {
    defaultValue: "false",
    initializeWithValue: false,
  });

  return {
    volume: localStorageVolume.value ? Number(localStorageVolume.value) : 1,
    autoscroll: localStorageAutoscroll.value === "true",
    looping: localStorageLooping.value === "true",
  };
}

export default useGetLocalStorageValues;
