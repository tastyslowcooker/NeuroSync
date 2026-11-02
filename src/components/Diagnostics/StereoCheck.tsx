import React from 'react';
import { EarIsolation } from '../../types/audio';

interface StereoCheckProps {
  earIsolation: EarIsolation;
  onSetEarIsolation: (mode: EarIsolation) => void;
  onShowMessage: (msg: string) => void;
}

export const StereoCheck: React.FC<StereoCheckProps> = ({
  earIsolation,
  onSetEarIsolation,
  onShowMessage
}) => {
  const handleSelect = (mode: EarIsolation) => {
    onSetEarIsolation(mode);
    if (mode === 'left') {
      onShowMessage('Diagnostic Active: Left ear muted. Pulsing beat should stop if stereo is pure.');
    } else if (mode === 'right') {
      onShowMessage('Diagnostic Active: Right ear muted. Pulsing beat should stop if stereo is pure.');
    } else {
      onShowMessage('Stereo Mode: Both ears active.');
    }
  };

  return (
    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
      <span className="px-2 text-slate-400 hidden md:inline">Stereo Check:</span>
      <button
        onClick={() => handleSelect('both')}
        className={`px-2.5 py-1 rounded-md font-medium transition ${
          earIsolation === 'both'
            ? 'bg-sky-500/20 text-sky-300'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        L+R
      </button>
      <button
        onClick={() => handleSelect('left')}
        title="Mute Left Ear - If you still hear a pulsing beat in your right ear, turn off spatial audio/Dolby!"
        className={`px-2.5 py-1 rounded-md transition ${
          earIsolation === 'left'
            ? 'bg-amber-500/20 text-amber-300 font-medium'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        Mute L
      </button>
      <button
        onClick={() => handleSelect('right')}
        title="Mute Right Ear - If you still hear a pulsing beat in your left ear, turn off spatial audio/Dolby!"
        className={`px-2.5 py-1 rounded-md transition ${
          earIsolation === 'right'
            ? 'bg-amber-500/20 text-amber-300 font-medium'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        Mute R
      </button>
    </div>
  );
};
