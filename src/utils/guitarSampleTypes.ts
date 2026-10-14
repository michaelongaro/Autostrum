export interface GuitarSample {
  buffer: AudioBuffer;
  rootMidi: number;
  stringIndex?: number;
}

export interface GuitarSampleRequest {
  midi: number;
  stringIndex: number;
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
  prepareSamples?: (notes: GuitarSampleRequest[]) => Promise<void>;
  getSample?: (
    midi: number,
    velocity: number,
    stringIndex?: number,
  ) => GuitarSample | undefined;
  getReferenceSample?: (
    midi: number,
    stringIndex?: number,
  ) => GuitarSample | undefined;
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
  stringIndex?: number;
}

export interface GuitarSampleManifest {
  version: 2;
  name: string;
  source: string;
  license: string;
  zones: GuitarSampleZone[];
}
