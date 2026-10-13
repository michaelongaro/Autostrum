export interface GuitarSample {
  buffer: AudioBuffer;
  rootMidi: number;
}

export interface GuitarPlaybackHandle {
  stop(when?: number): void;
  source?: AudioBufferSourceNode;
}

// The same small interface supports dedicated multisamples and the legacy
// soundfont fallback. Playback handles are voices, not instrument players.
export interface GuitarInstrument {
  name?: string;
  buffers?: Record<number, AudioBuffer>;
  output?: AudioNode;
  samplesReady?: Promise<void>;
  getSample?: (midi: number, velocity: number) => GuitarSample | undefined;
  getReferenceSample?: (midi: number) => GuitarSample | undefined;
  play(
    note: string,
    when?: number,
    options?: {
      gain?: number;
      attack?: number;
      release?: number;
      duration?: number;
    },
  ): GuitarPlaybackHandle;
  stop(when?: number): void;
}

export interface GuitarSampleZone {
  rootMidi: number;
  lowMidi: number;
  highMidi: number;
  lowVelocity: number;
  highVelocity: number;
  files: string[];
}

export interface GuitarSampleManifest {
  version: 1;
  name: string;
  source: string;
  license: string;
  zones: GuitarSampleZone[];
}
