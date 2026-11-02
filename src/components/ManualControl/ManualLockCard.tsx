import React from 'react';
import { Slider } from '../UI/Slider';

interface ManualLockCardProps {
  isManualLock: boolean;
  onToggleManualLock: () => void;
  beatHz: number;
  carrierHz: number;
  onSetBeatHz: (val: number) => void;
  onSetCarrierHz: (val: number) => void;
}

export const ManualLockCard: React.FC<ManualLockCardProps> = ({
  isManualLock,
  onToggleManualLock,
  beatHz,
  carrierHz,
  onSetBeatHz,
  onSetCarrierHz
}) => {
  return (
    <section className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Manual Frequency Lock</h2>
          <p className="text-xs text-slate-400">Override timeline to hold a static tone</p>
        </div>
        <button
          onClick={onToggleManualLock}
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
            isManualLock
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          {isManualLock ? 'Manual Lock: ON' : 'Timeline Active'}
        </button>
      </div>

      <Slider
        id="manualBeatSlider"
        label="Binaural Beat Frequency"
        value={beatHz}
        min={0.2}
        max={40}
        step={0.1}
        unit=" Hz"
        valueColorClass="text-sky-400"
        onChange={onSetBeatHz}
        subLabels={{
          left: '0.5Hz Delta',
          middle: ['6Hz Theta', '10Hz Alpha', '18Hz Beta'],
          right: '40Hz Gamma'
        }}
      />

      <Slider
        id="manualCarrierSlider"
        label="Carrier Pitch (Root Note)"
        value={carrierHz}
        min={60}
        max={500}
        step={0.5}
        unit=" Hz"
        valueColorClass="text-indigo-400"
        onChange={onSetCarrierHz}
        subLabels={{
          left: '60Hz Sub',
          middle: ['136.1Hz Om', '180Hz Warm'],
          right: '432Hz Crystal'
        }}
      />
    </section>
  );
};
