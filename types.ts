export interface NoteEvent {
  note: string;     // e.g., "C4", "F#3"
  duration: string; // e.g., "4n", "8n", "1m"
  time: string;     // e.g., "0:0:0", "0:1:2"
  velocity: number; // 0.0 to 1.0
}

export interface TrackData {
  name: string;
  instrument: 'synth' | 'bass' | 'drums' | 'pad';
  notes: NoteEvent[];
  color: string;
}

export interface Composition {
  title: string;
  bpm: number;
  scale: string;
  mood: string;
  tracks: TrackData[];
  description: string;
}

export enum GenerationState {
  IDLE,
  THINKING,
  COMPOSING,
  READY,
  ERROR
}

export interface AudioAnalysis {
  waveform: Float32Array;
  frequency: Uint8Array;
}