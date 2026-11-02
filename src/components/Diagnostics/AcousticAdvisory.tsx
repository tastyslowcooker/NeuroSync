import React from 'react';
import { Info } from 'lucide-react';

export const AcousticAdvisory: React.FC = () => {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 text-xs text-slate-400 leading-relaxed">
      <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
        <Info className="w-4 h-4 text-sky-400 shrink-0" />
        <span>Acoustic Entrainment Advisory</span>
      </div>
      Use stereo headphones and disable spatial audio or Dolby Atmos enhancements. Use the{' '}
      <span className="text-sky-300 font-mono">Mute L / Mute R</span> verification buttons at the top:
      when one ear is muted, the pulsing sensation should vanish completely, leaving a flat pure tone.
    </div>
  );
};
