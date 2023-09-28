import { useLocalStorageValue } from "@react-hookz/web";

function useGetLocalStorageValues() {
  const localStorageVolume = useLocalStorageValue("autostrumVolume", {
    defaultValue: "1",
    initializeWithValue: false,
  });

  const localStorageAutoscroll = useLocalStorageValue("autostrumAutoscroll", {
    defaultValue: "false",
    initializeWithValue: false,
  });

  const localStorageLooping = useLocalStorageValue("autostrumLooping", {
    defaultValue: "false",
    initializeWithValue: false,
  });

  return {
    volume: localStorageVolume.value ? Number(localStorageVolume.value) : 1,
    autoscroll: localStorageAutoscroll.value === "true" ?? false,
    looping: localStorageLooping.value === "true" ?? false,
  };
}

export default useGetLocalStorageValues;
