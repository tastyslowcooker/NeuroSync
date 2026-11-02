import { Preset, Stage } from '../types/preset';

export const BUILTIN_PRESETS: Preset[] = [
  {
    id: 'focus-90',
    name: '90-Min Focused Studying (v2 Style)',
    badge: '90m Beta/Alpha Wave',
    description: 'Gentle Alpha induction ramping into cycling Focused Beta waves (14–21 Hz) with dynamic carrier pitch modulation.',
    noiseType: 'brown',
    noiseVol: 35,
    noiseCutoff: 420,
    droneMode: 'octave',
    stages: [
      { label: 'Alpha Warm-Up', durationMin: 10, startBeat: 10.0, endBeat: 14.5, startCarrier: 174.0, endCarrier: 180.0 },
      { label: 'Deep Focus Climb', durationMin: 20, startBeat: 14.5, endBeat: 20.0, startCarrier: 180.0, endCarrier: 188.0 },
      { label: 'Sustained Flow Plateau', durationMin: 25, startBeat: 20.0, endBeat: 16.0, startCarrier: 188.0, endCarrier: 182.0 },
      { label: 'Second Wind Peak', durationMin: 20, startBeat: 16.0, endBeat: 21.5, startCarrier: 182.0, endCarrier: 192.0 },
      { label: 'Memory Consolidation', durationMin: 10, startBeat: 21.5, endBeat: 12.0, startCarrier: 192.0, endCarrier: 178.0 },
      { label: 'Alpha Cooldown', durationMin: 5, startBeat: 12.0, endBeat: 10.0, startCarrier: 178.0, endCarrier: 170.0 }
    ]
  },
  {
    id: 'sleep-8h',
    name: '8-Hour Full Sleep Cycle (Multi-Stage)',
    badge: '8h Delta/REM Cycles',
    description: '45-min descent into 0.5 Hz Deep Delta & sub-100 Hz warm carrier, followed by five 90-minute ultradian sleep cycles.',
    noiseType: 'brown',
    noiseVol: 45,
    noiseCutoff: 260,
    droneMode: 'octave',
    stages: [
      { label: 'Sleep Onset Descent', durationMin: 25, startBeat: 10.0, endBeat: 4.0, startCarrier: 160.0, endCarrier: 125.0 },
      { label: 'Deep Delta Entry', durationMin: 25, startBeat: 4.0, endBeat: 0.5, startCarrier: 125.0, endCarrier: 98.0 },
      { label: 'Cycle 1: Deep Rest', durationMin: 65, startBeat: 0.5, endBeat: 1.2, startCarrier: 98.0, endCarrier: 104.0 },
      { label: 'Cycle 1: REM Theta', durationMin: 25, startBeat: 1.2, endBeat: 5.5, startCarrier: 104.0, endCarrier: 122.0 },
      { label: 'Cycle 2: Deep Delta', durationMin: 65, startBeat: 5.5, endBeat: 0.6, startCarrier: 122.0, endCarrier: 96.0 },
      { label: 'Cycle 2: REM Theta', durationMin: 25, startBeat: 0.6, endBeat: 6.0, startCarrier: 96.0, endCarrier: 124.0 },
      { label: 'Cycle 3: Core Delta', durationMin: 60, startBeat: 6.0, endBeat: 0.8, startCarrier: 124.0, endCarrier: 98.0 },
      { label: 'Cycle 3: Dream Theta', durationMin: 30, startBeat: 0.8, endBeat: 6.5, startCarrier: 98.0, endCarrier: 128.0 },
      { label: 'Cycle 4: Light Delta', durationMin: 55, startBeat: 6.5, endBeat: 1.5, startCarrier: 128.0, endCarrier: 108.0 },
      { label: 'Cycle 4: Extended REM', durationMin: 35, startBeat: 1.5, endBeat: 7.5, startCarrier: 108.0, endCarrier: 132.0 },
      { label: 'Cycle 5: Morning Theta', durationMin: 50, startBeat: 7.5, endBeat: 4.5, startCarrier: 132.0, endCarrier: 140.0 },
      { label: 'Natural Awakening Ramp', durationMin: 20, startBeat: 4.5, endBeat: 12.5, startCarrier: 140.0, endCarrier: 176.0 }
    ]
  },
  {
    id: 'nap-30',
    name: '30-Min Power Nap (Full Recharge)',
    badge: '30m Fast Reset',
    description: 'Rapid ramp down to 3.5 Hz Delta/Theta border with deepening carrier pitch, ending with a bright 18 Hz / 210 Hz wake-up.',
    noiseType: 'pink',
    noiseVol: 30,
    noiseCutoff: 520,
    droneMode: 'off',
    stages: [
      { label: 'Fast Alpha Drop', durationMin: 6, startBeat: 12.0, endBeat: 6.0, startCarrier: 175.0, endCarrier: 148.0 },
      { label: 'Theta/Delta Border Hold', durationMin: 18, startBeat: 6.0, endBeat: 3.5, startCarrier: 148.0, endCarrier: 132.0 },
      { label: 'Crisp Beta Re-Awakening', durationMin: 6, startBeat: 3.5, endBeat: 18.0, startCarrier: 132.0, endCarrier: 210.0 }
    ]
  },
  {
    id: 'meditate-60',
    name: 'Extra Deep Meditation (60 Min Om)',
    badge: '60m 136.1Hz Theta',
    description: 'Smooth descent into 4.5 Hz Shamanic Theta state transitioning from 144 Hz into the 136.1 Hz Cosmic Om and 128 Hz Earth root.',
    noiseType: 'pink',
    noiseVol: 25,
    noiseCutoff: 380,
    droneMode: 'fifth',
    stages: [
      { label: 'Breath Centering', durationMin: 10, startBeat: 11.0, endBeat: 7.83, startCarrier: 144.0, endCarrier: 136.1 },
      { label: 'Schumann Resonance Hold', durationMin: 15, startBeat: 7.83, endBeat: 6.0, startCarrier: 136.1, endCarrier: 136.1 },
      { label: 'Deep Theta Immersion', durationMin: 25, startBeat: 6.0, endBeat: 4.5, startCarrier: 136.1, endCarrier: 128.0 },
      { label: 'Grounding Return', durationMin: 10, startBeat: 4.5, endBeat: 9.5, startCarrier: 128.0, endCarrier: 136.1 }
    ]
  }
];

export function normalizeStages(rawStages: any[]): Stage[] {
  return (rawStages || []).map((s, idx) => {
    const fallbackCarrier = typeof s.carrier === 'number' && !isNaN(s.carrier) ? s.carrier : 180.0;
    const startC = typeof s.startCarrier === 'number' && !isNaN(s.startCarrier) ? s.startCarrier : fallbackCarrier;
    const endC = typeof s.endCarrier === 'number' && !isNaN(s.endCarrier) ? s.endCarrier : startC;

    return {
      label: s.label || s.name || `Stage ${idx + 1}`,
      durationMin: Math.max(0.5, parseFloat(s.durationMin) || 10),
      startBeat: typeof s.startBeat === 'number' && !isNaN(s.startBeat) ? s.startBeat : 10.0,
      endBeat: typeof s.endBeat === 'number' && !isNaN(s.endBeat) ? s.endBeat : 10.0,
      startCarrier: startC,
      endCarrier: endC,
    };
  });
}
