import React from 'react';
import { DroneMode, NoiseType } from '../../types/audio';
import { Slider } from '../UI/Slider';

interface MixerSectionProps {
  binauralVol: number;
  onSetBinauralVol: (v: number) => void;
  noiseType: NoiseType;
  onSetNoiseType: (t: NoiseType) => void;
  noiseVol: number;
  onSetNoiseVol: (v: number) => void;
  noiseCutoff: number;
  onSetNoiseCutoff: (c: number) => void;
  droneMode: DroneMode;
  onSetDroneMode: (d: DroneMode) => void;
  droneVol: number;
  onSetDroneVol: (v: number) => void;
}

export const MixerSection: React.FC<MixerSectionProps> = ({
  binauralVol,
  onSetBinauralVol,
  noiseType,
  onSetNoiseType,
  noiseVol,
  onSetNoiseVol,
  noiseCutoff,
  onSetNoiseCutoff,
  droneMode,
  onSetDroneMode,
  droneVol,
  onSetDroneVol
}) => {
  return (
    <section className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-white">Procedural Acoustic Mixer</h2>
        <p className="text-xs text-slate-400">Real-time mathematical noise & harmonic synthesis</p>
      </div>

      {/* Binaural Sine Volume */}
      <Slider
        id="binauralVol"
        label="Binaural Pure Sine Gain"
        value={binauralVol}
        min={0}
        max={100}
        step={1}
        unit="%"
        valueColorClass="text-sky-400"
        onChange={onSetBinauralVol}
      />

      {/* Procedural Noise Generator */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300 font-medium">Procedural Noise Masking</span>
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => onSetNoiseType('off')}
              className={`px-2.5 py-1 rounded-md transition ${
                noiseType === 'off'
                  ? 'bg-sky-500/20 text-sky-300 font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Off
            </button>
            <button
              onClick={() => onSetNoiseType('pink')}
              className={`px-2.5 py-1 rounded-md transition ${
                noiseType === 'pink'
                  ? 'bg-sky-500/20 text-sky-300 font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pink
            </button>
            <button
              onClick={() => onSetNoiseType('brown')}
              className={`px-2.5 py-1 rounded-md transition ${
                noiseType === 'brown'
                  ? 'bg-sky-500/20 text-sky-300 font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Brown
            </button>
          </div>
        </div>

        <Slider
          id="noiseVol"
          label="Noise Level"
          value={noiseVol}
          min={0}
          max={100}
          step={1}
          unit="%"
          valueColorClass="text-slate-300"
          onChange={onSetNoiseVol}
        />

        <Slider
          id="noiseCutoff"
          label="Low-Pass Warmth Cutoff"
          value={noiseCutoff}
          min={80}
          max={2500}
          step={10}
          unit=" Hz"
          valueColorClass="text-slate-300"
          onChange={onSetNoiseCutoff}
        />
      </div>

      {/* Sub-Harmonic Warm Drone Layer */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-300 font-medium block">Harmonic Acoustic Pad</span>
            <span className="text-[11px] text-slate-500">Adds subtle -1 Octave / Perfect 5th sine warmth</span>
          </div>
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => onSetDroneMode('off')}
              className={`px-2 py-1 rounded-md transition ${
                droneMode === 'off'
                  ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Off
            </button>
            <button
              onClick={() => onSetDroneMode('octave')}
              className={`px-2 py-1 rounded-md transition ${
                droneMode === 'octave'
                  ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              -1 Oct
            </button>
            <button
              onClick={() => onSetDroneMode('fifth')}
              className={`px-2 py-1 rounded-md transition ${
                droneMode === 'fifth'
                  ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              +5th
            </button>
          </div>
        </div>

        <Slider
          id="droneVol"
          label="Harmonic Drone Level"
          value={droneVol}
          min={0}
          max={100}
          step={1}
          unit="%"
          valueColorClass="text-slate-300"
          onChange={onSetDroneVol}
        />
      </div>
    </section>
  );
};
