export type StringInstrument = (tuning: number[]) => Promise<{
  play: (string: number, fret: number, when: number) => void;
  dispose: () => void;
}>;

export type Player = {
  play: (string: number, fret: number, when: number) => Promise<void>;
  dispose: () => void;
};

const mainPlayer = async (
  instrument: StringInstrument,
  tuning: number[],
  onChange: (playing: boolean[]) => void
): Promise<Player> => {
  // async prob because you need to wait for instrument to load?
  const { play, dispose } = await instrument(tuning);

  // initialized as empty object, not sure why this is a partial
  const resolvers: Partial<{ [K: number]: (change?: boolean) => void }> = {};

  const playing = tuning.map(() => false);

  const setPlaying = (string: number, value: boolean) => {
    if (playing[string] !== value) {
      playing[string] = value;
      setTimeout(() => onChange([...playing]), 0);
    }
  };

  return {
    // THIS is probably where you would want to return new functions (stop/slide/etc.)

    play: (string, fret, when = 0) =>
      new Promise((resolve) => {
        resolvers[string]?.(when === 0);

        if (fret < 0) return resolve(); // return immediately if fret is negative

        console.log("tons of times?");
        const startTimeout = setTimeout(
          () => setPlaying(string, true),
          when * 1000
        );

        const endTimeout = setTimeout(
          (resolvers[string] = function (change) {
            delete resolvers[string];
            clearTimeout(startTimeout);
            clearTimeout(endTimeout);
            resolve();
            if (!change) setPlaying(string, false);
          }),
          1500 + when * 1000 // obv do more but maybe 3000 -> 2000 could make a noticiable difference
        );

        play(string, fret, when);
      }),
    dispose,
  };
};

export default mainPlayer;
