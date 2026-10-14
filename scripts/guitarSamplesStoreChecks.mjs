// Evaluate in a loaded tab page; uses the app's existing dev/test store surface.
export async function runGuitarStoreChecks() {
  const get = window.__AUTOSTRUM_GET_TAB_STORE__;
  if (!get?.().currentInstrument?.prepareSamples)
    throw new Error(
      "Open a loaded tab with the new sampler before running this check",
    );
  get().pauseAudio();
  const results = {};
  for (const kind of ["tab", "preview"]) {
    const state = get();
    const original = state.currentInstrument;
    const instruments = state.instruments;
    const player =
      kind === "preview"
        ? (instruments.acoustic_guitar_steel ?? original)
        : original;
    let release, entered;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const preparing = new Promise((resolve) => {
      entered = resolve;
    });
    const wrapped = {
      ...player,
      prepareSamples() {
        entered();
        return gate;
      },
    };
    let timer;
    try {
      if (kind === "preview")
        state.setInstruments({
          ...instruments,
          acoustic_guitar_steel: wrapped,
        });
      state.setCurrentInstrument(wrapped);
      const pending =
        kind === "tab"
          ? get().playTab({ location: null })
          : get().playPreview({
              type: "chord",
              data: ["0", "0", "0", "0", "0", "0"],
              index: 0,
            });
      await Promise.race([
        preparing,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`${kind}: preparation never started`)),
            3000,
          );
        }),
      ]);
      clearTimeout(timer);
      get().pauseAudio();
      release();
      await pending;
      const after = get();
      if (
        after.audioMetadata.playing ||
        after.previewMetadata.playing ||
        after.scheduledPlaybackNodes.length
      )
        throw new Error(`${kind}: cancelled preparation started audio`);
      results[`${kind}PreparationCancellation`] = "passed";
    } finally {
      clearTimeout(timer);
      release();
      get().pauseAudio();
      get().setInstruments(instruments);
      get().setCurrentInstrument(original);
    }
  }
  return results;
}
