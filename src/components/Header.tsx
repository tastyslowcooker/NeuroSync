import React from 'react';
import { Activity } from 'lucide-react';
import { EarIsolation } from '../types/audio';
import { StereoCheck } from './Diagnostics/StereoCheck';

interface HeaderProps {
  earIsolation: EarIsolation;
  onSetEarIsolation: (mode: EarIsolation) => void;
  isWakeLocked: boolean;
  onToggleWakeLock: () => void;
  onShowMessage: (msg: string) => void;
  isUsingWorklet?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  earIsolation,
  onSetEarIsolation,
  isWakeLocked,
  onToggleWakeLock,
  onShowMessage,
  isUsingWorklet
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-white">
                BIN<span className="text-sky-400">BEAT</span>
              </h1>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                100% Math DSP
              </span>
              {isUsingWorklet && (
                <span className="hidden sm:inline text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  AudioWorklet
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Zero-Asset Multi-Stage Binaural Entrainment Synthesizer
            </p>
          </div>
        </div>

        {/* Diagnostics & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <StereoCheck
            earIsolation={earIsolation}
            onSetEarIsolation={onSetEarIsolation}
            onShowMessage={onShowMessage}
          />

          {/* Wake Lock Toggle */}
          <button
            onClick={onToggleWakeLock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition"
            title="Keep screen active during entrainment sessions"
          >
            <span
              className={`w-2 h-2 rounded-full transition ${
                isWakeLocked
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-slate-600'
              }`}
            />
            <span>{isWakeLocked ? 'Wake Lock: On' : 'Wake Lock: Off'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
