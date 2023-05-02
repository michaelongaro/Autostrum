import Soundfont, { type InstrumentName } from "soundfont-player";
import { type StringInstrument } from "./player";

export default function withSoundFont(
  instrumentName: InstrumentName,
  options?: {
    format?: "mp3" | "ogg";
    soundfont?: "FluidR3_GM" | "MusyngKite";
  }
): StringInstrument {
  return async (tuning) => {
    const audioContext = new (window.AudioContext ||
      ((window as any).webkitAudioContext as typeof AudioContext))();

    const player = await Soundfont.instrument(audioContext, instrumentName, {
      ...options,
    });

    return {
      play: (string, fret, when = 0) => {
        player.play(
          (tuning[string] + fret) as any,
          audioContext.currentTime + when,
          {
            duration: 2, // was 4
            gain: 4,
          }
        );
        // player.schedule could be useful for playing the whole tab,
        // but need to look into it first
      },
      dispose: () => {
        player.stop();
        audioContext.close();
      },
    };
  };
}
