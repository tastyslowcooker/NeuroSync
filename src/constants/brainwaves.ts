import { BrainwaveBand } from '../types/audio';

export function getBrainwaveBand(hz: number): BrainwaveBand {
  if (hz < 4.0) {
    return {
      name: 'DELTA WAVE',
      range: '(0.2 – 3.9 Hz)',
      desc: 'Deep dreamless sleep, cellular restoration & HGH release',
      dotClass: 'bg-purple-400 shadow-[0_0_12px_#c084fc]',
      colorHex: '#c084fc'
    };
  } else if (hz < 8.0) {
    return {
      name: 'THETA WAVE',
      range: '(4.0 – 7.9 Hz)',
      desc: 'Deep meditation, REM dreaming, hypnosis & inward intuition',
      dotClass: 'bg-indigo-400 shadow-[0_0_12px_#818cf8]',
      colorHex: '#818cf8'
    };
  } else if (hz < 13.0) {
    return {
      name: 'ALPHA WAVE',
      range: '(8.0 – 12.9 Hz)',
      desc: 'Calm focus, relaxed alertness, stress reduction & flow entry',
      dotClass: 'bg-emerald-400 shadow-[0_0_12px_#34d399]',
      colorHex: '#34d399'
    };
  } else if (hz <= 30.0) {
    return {
      name: 'BETA WAVE',
      range: '(13.0 – 30.0 Hz)',
      desc: 'Active analytical concentration, studying & cognitive engagement',
      dotClass: 'bg-sky-400 shadow-[0_0_12px_#38bdf8]',
      colorHex: '#38bdf8'
    };
  } else {
    return {
      name: 'GAMMA WAVE',
      range: '(30.1 – 40.0 Hz)',
      desc: 'Peak cross-modal binding, high-level synthesis & insight',
      dotClass: 'bg-rose-400 shadow-[0_0_12px_#fb7185]',
      colorHex: '#fb7185'
    };
  }
}
