import { useState, useEffect, useRef, useCallback } from 'react';
import { BUILTIN_PRESETS, normalizeStages } from '../constants/presets';
import { getBrainwaveBand } from '../constants/brainwaves';
import { Preset, Stage } from '../types/preset';
import { DroneMode, EarIsolation, NoiseType, TelemetryState } from '../types/audio';
import { audioEngine } from '../audio/AudioEngine';

export function computeSequenceStateAtTime(sec: number, stages: Stage[]) {
  const totalSec = stages.reduce((acc, s) => acc + Math.max(0.5, s.durationMin) * 60, 0);
  const clampedSec = Math.max(0, Math.min(sec, totalSec));

  let accumulated = 0;
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const stageDurSec = Math.max(0.5, stage.durationMin) * 60;

    if (clampedSec <= accumulated + stageDurSec || i === stages.length - 1) {
      const localSec = clampedSec - accumulated;
      const progress = Math.max(0, Math.min(1, localSec / stageDurSec));
      const beat = stage.startBeat + (stage.endBeat - stage.startBeat) * progress;
      const carrier = stage.startCarrier + (stage.endCarrier - stage.startCarrier) * progress;

      return {
        stageIndex: i,
        stageLabel: stage.label,
        beatHz: beat,
        carrierHz: carrier,
        progress,
        totalSec
      };
    }
    accumulated += stageDurSec;
  }

  return { stageIndex: 0, stageLabel: 'Init', beatHz: 10, carrierHz: 180, progress: 0, totalSec };
}

function updateMediaSessionPosition(elapsedSec: number, totalSec: number, isPlaying: boolean) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  if (typeof navigator.mediaSession.setPositionState !== 'function') return;
  if (!Number.isFinite(totalSec) || totalSec <= 0) return;

  try {
    navigator.mediaSession.setPositionState({
      duration: totalSec,
      playbackRate: isPlaying ? 1 : 0,
      position: Math.max(0, Math.min(elapsedSec, totalSec))
    });
  } catch {
    // Ignore unsupported position state edge cases
  }
}

export function useAudioSession() {
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const saved = localStorage.getItem('neurosync_custom_preset');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.stages = normalizeStages(parsed.stages);
        return [...BUILTIN_PRESETS, parsed];
      }
    } catch {
      // Ignore storage error
    }
    return [...BUILTIN_PRESETS];
  });

  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const [stages, setStages] = useState<Stage[]>(() => normalizeStages(BUILTIN_PRESETS[0].stages));

  const [isPlaying, setIsPlaying] = useState(false);
  const [isManualLock, setIsManualLock] = useState(false);
  const [earIsolation, setEarIsolationState] = useState<EarIsolation>('both');

  const [noiseType, setNoiseTypeState] = useState<NoiseType>('brown');
  const [noiseVol, setNoiseVol] = useState(35);
  const [noiseCutoff, setNoiseCutoff] = useState(420);

  const [droneMode, setDroneModeState] = useState<DroneMode>('octave');
  const [droneVol, setDroneVol] = useState(20);

  const [binauralVol, setBinauralVol] = useState(65);

  const [sessionElapsedSec, setSessionElapsedSec] = useState(0);
  const [beatHz, setBeatHz] = useState(12.0);
  const [carrierHz, setCarrierHz] = useState(180.0);

  // Synchronized refs for callbacks & timers
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isManualLockRef = useRef(isManualLock);
  isManualLockRef.current = isManualLock;
  const stagesRef = useRef(stages);
  stagesRef.current = stages;
  const elapsedRef = useRef(sessionElapsedSec);
  const beatHzRef = useRef(beatHz);
  beatHzRef.current = beatHz;
  const carrierHzRef = useRef(carrierHz);
  carrierHzRef.current = carrierHz;

  const activePreset = presets[activePresetIndex] || presets[0];
  const activePresetNameRef = useRef(activePreset.name);
  activePresetNameRef.current = activePreset.name;

  // Sync UI & lock-screen state from the hardware AudioContext timeline
  const syncFromEngine = useCallback((updateReactState: boolean) => {
    if (!isPlayingRef.current || isManualLockRef.current) return;

    const nextElapsed = audioEngine.getSequenceElapsedSec();
    elapsedRef.current = nextElapsed;

    const computed = computeSequenceStateAtTime(nextElapsed, stagesRef.current);
    beatHzRef.current = computed.beatHz;
    carrierHzRef.current = computed.carrierHz;

    if (updateReactState) {
      setSessionElapsedSec(nextElapsed);
      setBeatHz(computed.beatHz);
      setCarrierHz(computed.carrierHz);
    }

    return computed;
  }, []);

  // Foreground 60fps UI loop + background keep-synced interval + visibility wake-up
  useEffect(() => {
    let animId: number | null = null;

    const tick = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        syncFromEngine(true);
        animId = requestAnimationFrame(tick);
      } else {
        animId = null;
      }
    };

    const startRaf = () => {
      if (animId === null && (typeof document === 'undefined' || !document.hidden)) {
        animId = requestAnimationFrame(tick);
      }
    };

    startRaf();

    // Background interval keeps MediaSession position & loop horizon updated while locked
    const bgInterval = setInterval(() => {
      if (!isPlayingRef.current) return;
      const isHidden = typeof document !== 'undefined' && document.hidden;
      const computed = syncFromEngine(!isHidden);
      if (computed) {
        updateMediaSessionPosition(elapsedRef.current, computed.totalSec, true);
      }
    }, 2000);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        syncFromEngine(true);
        startRaf();
      } else if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      clearInterval(bgInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [syncFromEngine]);

  // Update audio mixer when levels change
  useEffect(() => {
    audioEngine.setMixerLevels(
      binauralVol / 100,
      noiseVol / 100,
      noiseCutoff,
      droneVol / 100
    );
  }, [binauralVol, noiseVol, noiseCutoff, droneVol]);

  const startPlayback = useCallback(async () => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setIsPlaying(true);

    if (isManualLockRef.current) {
      audioEngine.setFrequencies(beatHzRef.current, carrierHzRef.current);
    } else {
      const computed = computeSequenceStateAtTime(elapsedRef.current, stagesRef.current);
      beatHzRef.current = computed.beatHz;
      carrierHzRef.current = computed.carrierHz;
      setBeatHz(computed.beatHz);
      setCarrierHz(computed.carrierHz);
    }

    await audioEngine.play(
      stagesRef.current,
      elapsedRef.current,
      isManualLockRef.current
    );

    const total = stagesRef.current.reduce((acc, s) => acc + Math.max(0.5, s.durationMin) * 60, 0);
    updateMediaSessionPosition(elapsedRef.current, total, true);
  }, []);

  const pausePlayback = useCallback(() => {
    if (!isPlayingRef.current) return;
    if (!isManualLockRef.current) {
      const finalElapsed = audioEngine.getSequenceElapsedSec();
      elapsedRef.current = finalElapsed;
      setSessionElapsedSec(finalElapsed);
    }
    audioEngine.pause();
    isPlayingRef.current = false;
    setIsPlaying(false);

    const total = stagesRef.current.reduce((acc, s) => acc + Math.max(0.5, s.durationMin) * 60, 0);
    updateMediaSessionPosition(elapsedRef.current, total, false);
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlayingRef.current) {
      pausePlayback();
    } else {
      await startPlayback();
    }
  }, [pausePlayback, startPlayback]);

  const selectPreset = useCallback((index: number) => {
    const p = presets[index];
    if (!p) return;

    setActivePresetIndex(index);
    const newStages = normalizeStages(p.stages);
    stagesRef.current = newStages;
    setStages(newStages);
    elapsedRef.current = 0;
    setSessionElapsedSec(0);

    if (isManualLockRef.current) {
      isManualLockRef.current = false;
      setIsManualLock(false);
    }

    setNoiseTypeState(p.noiseType);
    setNoiseVol(p.noiseVol);
    setNoiseCutoff(p.noiseCutoff);
    setDroneModeState(p.droneMode);

    audioEngine.setNoiseType(p.noiseType);
    audioEngine.setDroneMode(p.droneMode);
    audioEngine.setMixerLevels(binauralVol / 100, p.noiseVol / 100, p.noiseCutoff, droneVol / 100);

    const initial = computeSequenceStateAtTime(0, newStages);
    beatHzRef.current = initial.beatHz;
    carrierHzRef.current = initial.carrierHz;
    setBeatHz(initial.beatHz);
    setCarrierHz(initial.carrierHz);
    audioEngine.scheduleSequence(newStages, 0, false);
    updateMediaSessionPosition(0, initial.totalSec, isPlayingRef.current);
  }, [presets, binauralVol, droneVol]);

  const scrubTimeline = useCallback((sec: number) => {
    const totalSec = stagesRef.current.reduce((acc, s) => acc + Math.max(0.5, s.durationMin) * 60, 0);
    const clamped = Math.max(0, Math.min(sec, totalSec));
    elapsedRef.current = clamped;
    setSessionElapsedSec(clamped);

    if (isManualLockRef.current) {
      isManualLockRef.current = false;
      setIsManualLock(false);
    }

    const state = computeSequenceStateAtTime(clamped, stagesRef.current);
    beatHzRef.current = state.beatHz;
    carrierHzRef.current = state.carrierHz;
    setBeatHz(state.beatHz);
    setCarrierHz(state.carrierHz);
    audioEngine.scheduleSequence(stagesRef.current, clamped, false);
    updateMediaSessionPosition(clamped, totalSec, isPlayingRef.current);
  }, []);

  const resetTimeline = useCallback(() => {
    scrubTimeline(0);
  }, [scrubTimeline]);

  const toggleManualLock = useCallback(() => {
    const nextLock = !isManualLockRef.current;
    if (nextLock) {
      if (isPlayingRef.current) {
        const curElapsed = audioEngine.getSequenceElapsedSec();
        elapsedRef.current = curElapsed;
        setSessionElapsedSec(curElapsed);
      }
      isManualLockRef.current = true;
      setIsManualLock(true);
      audioEngine.setFrequencies(beatHzRef.current, carrierHzRef.current);
    } else {
      isManualLockRef.current = false;
      setIsManualLock(false);
      const state = computeSequenceStateAtTime(elapsedRef.current, stagesRef.current);
      beatHzRef.current = state.beatHz;
      carrierHzRef.current = state.carrierHz;
      setBeatHz(state.beatHz);
      setCarrierHz(state.carrierHz);
      audioEngine.scheduleSequence(stagesRef.current, elapsedRef.current, false);
    }
  }, []);

  const setManualBeat = useCallback((hz: number) => {
    if (!isManualLockRef.current) {
      if (isPlayingRef.current) {
        const curElapsed = audioEngine.getSequenceElapsedSec();
        elapsedRef.current = curElapsed;
        setSessionElapsedSec(curElapsed);
      }
      isManualLockRef.current = true;
      setIsManualLock(true);
    }
    beatHzRef.current = hz;
    setBeatHz(hz);
    audioEngine.setFrequencies(hz, carrierHzRef.current);
  }, []);

  const setManualCarrier = useCallback((hz: number) => {
    if (!isManualLockRef.current) {
      if (isPlayingRef.current) {
        const curElapsed = audioEngine.getSequenceElapsedSec();
        elapsedRef.current = curElapsed;
        setSessionElapsedSec(curElapsed);
      }
      isManualLockRef.current = true;
      setIsManualLock(true);
    }
    carrierHzRef.current = hz;
    setCarrierHz(hz);
    audioEngine.setFrequencies(beatHzRef.current, hz);
  }, []);

  const setEarIsolation = useCallback((mode: EarIsolation) => {
    setEarIsolationState(mode);
    audioEngine.setEarIsolation(mode);
  }, []);

  const setNoiseType = useCallback((type: NoiseType) => {
    setNoiseTypeState(type);
    audioEngine.setNoiseType(type);
  }, []);

  const setDroneMode = useCallback((mode: DroneMode) => {
    setDroneModeState(mode);
    audioEngine.setDroneMode(mode);
  }, []);

  const updateStages = useCallback((newStages: Stage[]) => {
    const normalized = normalizeStages(newStages);
    stagesRef.current = normalized;
    setStages(normalized);

    const newTotal = normalized.reduce((acc, s) => acc + Math.max(0.5, s.durationMin) * 60, 0);
    if (elapsedRef.current > newTotal) {
      elapsedRef.current = newTotal;
      setSessionElapsedSec(newTotal);
    }

    const state = computeSequenceStateAtTime(elapsedRef.current, normalized);
    if (!isManualLockRef.current) {
      beatHzRef.current = state.beatHz;
      carrierHzRef.current = state.carrierHz;
      setBeatHz(state.beatHz);
      setCarrierHz(state.carrierHz);
      audioEngine.scheduleSequence(normalized, elapsedRef.current, false);
    }
  }, []);

  const saveCustomPreset = useCallback((customStages: Stage[]) => {
    const totalMin = Math.round(customStages.reduce((acc, s) => acc + s.durationMin, 0));
    const custom: Preset = {
      id: 'custom-user',
      name: 'Custom User Sequence',
      badge: `${totalMin}m Custom`,
      description: 'User-configured multi-stage binaural entrainment sequence saved in browser storage.',
      noiseType,
      noiseVol,
      noiseCutoff,
      droneMode,
      stages: JSON.parse(JSON.stringify(customStages))
    };

    try {
      localStorage.setItem('neurosync_custom_preset', JSON.stringify(custom));
      setPresets(prev => {
        const existingIdx = prev.findIndex(p => p.id === 'custom-user');
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = custom;
          return updated;
        }
        return [...prev, custom];
      });
      return true;
    } catch {
      return false;
    }
  }, [noiseType, noiseVol, noiseCutoff, droneMode]);

  const totalSec = stages.reduce((acc, s) => acc + Math.max(0.5, s.durationMin) * 60, 0);
  const computedState = computeSequenceStateAtTime(sessionElapsedSec, stages);
  const band = getBrainwaveBand(beatHz);

  // Register OS Lock Screen / Headphone Media Session controls
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const safeSetHandler = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null
    ) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Ignore actions unsupported by specific mobile browsers
      }
    };

    safeSetHandler('play', () => {
      startPlayback();
    });
    safeSetHandler('pause', () => {
      pausePlayback();
    });
    safeSetHandler('stop', () => {
      pausePlayback();
      resetTimeline();
    });
    safeSetHandler('seekbackward', (details) => {
      scrubTimeline(elapsedRef.current - (details.seekOffset ?? 30));
    });
    safeSetHandler('seekforward', (details) => {
      scrubTimeline(elapsedRef.current + (details.seekOffset ?? 30));
    });
    safeSetHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') {
        scrubTimeline(details.seekTime);
      }
    });

    return () => {
      safeSetHandler('play', null);
      safeSetHandler('pause', null);
      safeSetHandler('stop', null);
      safeSetHandler('seekbackward', null);
      safeSetHandler('seekforward', null);
      safeSetHandler('seekto', null);
    };
  }, [startPlayback, pausePlayback, resetTimeline, scrubTimeline]);

  // Keep OS Lock Screen playback state & metadata updated
  const mediaTitle = isManualLock
    ? `Manual Frequency Hold (${beatHz.toFixed(1)} Hz)`
    : activePreset.name;
  const mediaSubtitle = isManualLock
    ? `${band.name} • ${carrierHz.toFixed(0)} Hz Carrier`
    : `Stage ${computedState.stageIndex + 1}/${stages.length}: ${computedState.stageLabel}`;

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    if (typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: mediaTitle,
        artist: mediaSubtitle,
        album: `NeuroSync • ${band.name}`,
        artwork: [
          { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });
    }
  }, [isPlaying, mediaTitle, mediaSubtitle, band.name]);

  const telemetry: TelemetryState = {
    beatHz,
    carrierHz,
    leftHz: Math.max(20, carrierHz - beatHz / 2),
    rightHz: Math.max(20, carrierHz + beatHz / 2),
    elapsedSec: sessionElapsedSec,
    totalSec,
    stageIndex: computedState.stageIndex,
    stageLabel: computedState.stageLabel,
    stageCount: stages.length
  };

  return {
    presets,
    activePresetIndex,
    activePreset,
    stages,
    isPlaying,
    isManualLock,
    earIsolation,
    noiseType,
    noiseVol,
    noiseCutoff,
    droneMode,
    droneVol,
    binauralVol,
    telemetry,
    togglePlay,
    selectPreset,
    scrubTimeline,
    resetTimeline,
    toggleManualLock,
    setManualBeat,
    setManualCarrier,
    setEarIsolation,
    setNoiseType,
    setNoiseVol,
    setNoiseCutoff,
    setDroneMode,
    setDroneVol,
    setBinauralVol,
    updateStages,
    saveCustomPreset
  };
}
