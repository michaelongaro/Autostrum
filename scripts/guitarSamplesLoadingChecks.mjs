// Native browser checks for cache isolation, direct reference notes, and the legacy fallback.
import { ensureSoundfontPlayer } from "../src/utils/soundfontRuntime";
export async function runGuitarLoadingChecks() {
  const context = new AudioContext();
  const a = context.createGain(),
    b = context.createGain();
  const [first, same, other] = await Promise.all([
    ensureSoundfontPlayer(context, "acoustic_guitar_steel", a),
    ensureSoundfontPlayer(context, "acoustic_guitar_steel", a),
    ensureSoundfontPlayer(context, "acoustic_guitar_steel", b),
  ]);
  if (first !== same || first === other || first.output === other.output)
    throw new Error("Context/destination caching failed");
  await first.samplesReady;
  const playContext = new OfflineAudioContext(1, 48000, 48000);
  const { loadGuitarSamplePlayer } =
    await import("../src/utils/guitarSampleRuntime");
  const player = await loadGuitarSamplePlayer(
    playContext,
    "electric_guitar_clean",
    playContext.destination,
  );
  const handle = player.play("Db4", 0.1, { duration: 0.15, gain: 1 });
  handle.stop(0.18);
  const rendered = await playContext.startRendering();
  const data = rendered.getChannelData(0);
  let energy = 0,
    after = 0;
  for (let i = 6000; i < 8000; i++) energy += data[i] ** 2;
  for (let i = 12000; i < data.length; i++) after += data[i] ** 2;
  if (energy < 0.0001 || after > 0.00001)
    throw new Error("Direct reference playback/cancellation failed");
  await player.samplesReady;
  await context.close();
  const fallbackContext = new AudioContext();
  const originalFetch = window.fetch;
  window.fetch = (input, init) =>
    String(input).includes("/sounds/guitars/")
      ? Promise.resolve(new Response(null, { status: 404 }))
      : originalFetch(input, init);
  let fallback;
  try {
    fallback = await ensureSoundfontPlayer(
      fallbackContext,
      "electric_guitar_clean",
      fallbackContext.destination,
    );
  } finally {
    window.fetch = originalFetch;
  }
  if (fallback.getSample || !fallback.buffers?.[64])
    throw new Error("Legacy fallback failed");
  await fallbackContext.close();
  return {
    destinationCache: "passed",
    directReference: "passed",
    missingSamplesFallback: "passed",
  };
}
