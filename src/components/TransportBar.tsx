import React from 'react';
import { Play, Pause } from 'lucide-react';
import { TelemetryState } from '../types/audio';
import { getBrainwaveBand } from '../constants/brainwaves';

interface TransportBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  presetName: string;
  telemetry: TelemetryState;
  isManualLock: boolean;
}

export function formatHMS(totalSeconds: number): string {
  const s = Math.floor(Math.max(0, totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return [hrs, mins, secs].map(v => String(v).padStart(2, '0')).join(':');
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  onTogglePlay,
  presetName,
  telemetry,
  isManualLock
}) => {
  const band = getBrainwaveBand(telemetry.beatHz);

  return (
    <section className="glass-panel rounded-2xl p-5 sm:p-6 shadow-glow-cyan relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        {/* Play/Pause & Session Info */}
        <div className="flex items-center gap-4">
          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause Entrainment' : 'Start Entrainment'}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 transition transform active:scale-95 shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 ml-0.5 fill-current" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg text-white">
                {isManualLock ? 'Manual Frequency Hold' : presetName}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs font-mono text-slate-400">
              <span className="text-sky-400 font-semibold">
                {formatHMS(telemetry.elapsedSec)}
              </span>
              <span>/</span>
              <span>{formatHMS(telemetry.totalSec)}</span>
              <span className="text-slate-600">|</span>
              <span className="text-indigo-300">
                {isManualLock
                  ? 'Manual Override Active'
                  : `Stage ${telemetry.stageIndex + 1}/${telemetry.stageCount}: ${telemetry.stageLabel}`}
              </span>
            </div>
          </div>
        </div>

        {/* Brainwave State Pill */}
        <div className="px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/70 flex items-center gap-3 self-start md:self-auto">
          <div className={`w-3.5 h-3.5 rounded-full ${band.dotClass}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-white">
                {band.name}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {band.range}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {band.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Real-Time Mathematical Frequency Readout Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
            Binaural Beat Δ
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-bold text-sky-400">
              {telemetry.beatHz.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400">Hz</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            |fR − fL| Entrainment
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
            Root Carrier
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-bold text-indigo-400">
              {telemetry.carrierHz.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400">Hz</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Center Pitch Reference
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
            Left Ear (Pan -1)
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-mono font-semibold text-emerald-400">
              {telemetry.leftHz.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400">Hz</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Carrier − (Beat / 2)
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
            Right Ear (Pan +1)
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-mono font-semibold text-amber-400">
              {telemetry.rightHz.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400">Hz</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Carrier + (Beat / 2)
          </div>
        </div>
      </div>
    </section>
  );
};
