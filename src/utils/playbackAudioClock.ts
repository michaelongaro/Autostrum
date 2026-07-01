function getAudioContextOutputTimeSeconds(audioContext: AudioContext) {
  if (typeof audioContext.getOutputTimestamp === "function") {
    const timestamp = audioContext.getOutputTimestamp();

    if (
      Number.isFinite(timestamp.contextTime) &&
      timestamp.contextTime >= 0
    ) {
      return timestamp.contextTime;
    }
  }

  return audioContext.currentTime;
}

export { getAudioContextOutputTimeSeconds };
