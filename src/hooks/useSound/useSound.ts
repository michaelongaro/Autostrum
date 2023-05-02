import { useEffect, useState, useCallback } from "react";
import makePlayer, { type Player, type StringInstrument } from "./player";
import withSoundFont from "./soundFont";
// import withSamples from "./instruments/samples";

export { type StringInstrument, withSoundFont };

const defaultInstrument = withSoundFont("acoustic_guitar_steel", {
  soundfont: "MusyngKite",
});

// how to maybe make this a hook of our own...

export default function useSound(props: {
  instrument?: StringInstrument;
  tabData: number[][];
  tuning: number[];
  muted?: boolean;
}) {
  const { tabData, tuning, muted, instrument = defaultInstrument } = props;
  const [player, setPlayer] = useState<Player>();
  const [playing, setPlaying] = useState(tuning.map(() => false));

  useEffect(() => {
    const promise = makePlayer(instrument, tuning, setPlaying);

    promise.then(setPlayer);

    return () => {
      setPlayer(undefined);
      promise.then((player) => {
        player.dispose();
      });
    };
  }, [instrument, tuning]);

  console.log("rendering changes");

  const play = useCallback(
    (string: number, fret: number, when = 0) => {
      //tabData[string] ?? 0
      if (!muted) player?.play(string, fret, when);
    },
    [muted, player]
  );

  // copilot generated
  const stop = useCallback(() => {
    setPlaying(tuning.map(() => false));
  }, [tuning]);

  const playTab = useCallback(() => {
    // a section is a set of notes played at the same time (one column in the tab)
    for (let section = 0; section < tabData.length; section++) {
      // remember that high e is 0 and low e is 5
      for (let string = 0; string < tabData[section].length; string++) {
        const fret = tabData[section]?.[string];
        if (fret !== undefined && fret > -1) {
          console.log("playing", string, fret, section * 1500);
          play(string, fret, section * 0.25); // 1.5 should by dynamic based on tempo
        }
      }
    }
  }, [play, tabData]);

  const strum = useCallback(
    (up: boolean, when: number) =>
      tuning.forEach((_, i) =>
        play(!up ? tuning.length - i - 1 : i, 0.05 * i + when)
      ),
    [tuning, play]
  );

  return { play, strum, playTab, playing, loading: !player };
}
