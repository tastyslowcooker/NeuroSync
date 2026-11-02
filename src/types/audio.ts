export type NoiseType = 'off' | 'pink' | 'brown';
export type DroneMode = 'off' | 'octave' | 'fifth';
export type EarIsolation = 'both' | 'left' | 'right'; // 'left' = mute left ear, 'right' = mute right ear

export interface BrainwaveBand {
  name: string;
  range: string;
  desc: string;
  dotClass: string;
  colorHex: string;
}

export interface AudioEngineGains {
  binauralGain: number; // 0..1
  noiseGain: number;    // 0..1
  noiseCutoff: number;  // 80..2500
  droneGain: number;    // 0..1
}

export interface TelemetryState {
  beatHz: number;
  carrierHz: number;
  leftHz: number;
  rightHz: number;
  elapsedSec: number;
  totalSec: number;
  stageIndex: number;
  stageLabel: string;
  stageCount: number;
}
