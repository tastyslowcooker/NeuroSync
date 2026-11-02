import { DroneMode, NoiseType } from './audio';

export interface Stage {
  label: string;
  durationMin: number;
  startBeat: number;
  endBeat: number;
  startCarrier: number;
  endCarrier: number;
}

export interface Preset {
  id: string;
  name: string;
  badge: string;
  description: string;
  noiseType: NoiseType;
  noiseVol: number;
  noiseCutoff: number;
  droneMode: DroneMode;
  stages: Stage[];
}
