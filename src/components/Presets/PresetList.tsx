import React from 'react';
import { Preset } from '../../types/preset';

interface PresetListProps {
  presets: Preset[];
  activePresetIndex: number;
  onSelectPreset: (index: number) => void;
}

export const PresetList: React.FC<PresetListProps> = ({
  presets,
  activePresetIndex,
  onSelectPreset
}) => {
  return (
    <section className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Entrainment Programs</h2>
        <span className="text-[11px] font-mono text-slate-400">Multi-Stage Curves</span>
      </div>
      <div className="flex flex-col gap-2">
        {presets.map((p, idx) => {
          const isActive = idx === activePresetIndex;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPreset(idx)}
              className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1 ${
                isActive
                  ? 'bg-sky-500/15 border-sky-500/50 shadow-md shadow-sky-950/50'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-semibold text-xs sm:text-sm ${
                    isActive ? 'text-sky-300' : 'text-white'
                  }`}
                >
                  {p.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                  {p.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                {p.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};
