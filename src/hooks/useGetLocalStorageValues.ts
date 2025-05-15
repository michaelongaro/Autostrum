import { useLocalStorageValue } from "@react-hookz/web";

function useGetLocalStorageValues() {
  const localStorageVolume = useLocalStorageValue("autostrum-Volume", {
    defaultValue: "1",
    initializeWithValue: true,
  });

  const localStorageAutoscroll = useLocalStorageValue("autostrum-Autoscroll", {
    defaultValue: "true",
    initializeWithValue: true,
  });

  const localStorageLooping = useLocalStorageValue("autostrum-Looping", {
    defaultValue: "false",
    initializeWithValue: true,
  });

  return {
    volume: localStorageVolume.value ? Number(localStorageVolume.value) : 1,
    autoscroll: localStorageAutoscroll.value === "true",
    looping: localStorageLooping.value === "true",
  };
}

export default useGetLocalStorageValues;
