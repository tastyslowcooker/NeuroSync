import { useState, useEffect, useRef, useCallback } from 'react';
import { BUILTIN_PRESETS, normalizeStages } from '../constants/presets';
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

export function useAudioSession() {
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const saved = localStorage.getItem('neurosync_custom_preset');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.stages = normalizeStages(parsed.stages);
        return [...BUILTIN_PRESETS, parsed];
      }
    } catch (e) {
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

  // Keep references for animation frame loop
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isManualLockRef = useRef(isManualLock);
  isManualLockRef.current = isManualLock;
  const stagesRef = useRef(stages);
  stagesRef.current = stages;
  const elapsedRef = useRef(sessionElapsedSec);
  elapsedRef.current = sessionElapsedSec;

  const lastFrameTimeRef = useRef(performance.now());

  // Setup loop
  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastFrameTimeRef.current) / 1000);
      lastFrameTimeRef.current = now;

      if (isPlayingRef.current && !isManualLockRef.current) {
        const totalSec = stagesRef.current.reduce((acc, s) => acc + Math.max(0.5, s.durationMin) * 60, 0);
        let nextElapsed = elapsedRef.current + dt;
        if (nextElapsed >= totalSec) {
          nextElapsed = 0; // loop or reset
        }
        elapsedRef.current = nextElapsed;
        setSessionElapsedSec(nextElapsed);

        const computed = computeSequenceStateAtTime(nextElapsed, stagesRef.current);
        setBeatHz(computed.beatHz);
        setCarrierHz(computed.carrierHz);
        audioEngine.setFrequencies(computed.beatHz, computed.carrierHz);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Update audio mixer when levels change
  useEffect(() => {
    audioEngine.setMixerLevels(
      binauralVol / 100,
      noiseVol / 100,
      noiseCutoff,
      droneVol / 100
    );
  }, [binauralVol, noiseVol, noiseCutoff, droneVol]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      await audioEngine.play();
      setIsPlaying(true);
      lastFrameTimeRef.current = performance.now();
    }
  }, [isPlaying]);

  const selectPreset = useCallback((index: number) => {
    const p = presets[index];
    if (!p) return;

    setActivePresetIndex(index);
    const newStages = normalizeStages(p.stages);
    setStages(newStages);
    setSessionElapsedSec(0);
    elapsedRef.current = 0;

    if (isManualLock) {
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
    setBeatHz(initial.beatHz);
    setCarrierHz(initial.carrierHz);
    audioEngine.setFrequencies(initial.beatHz, initial.carrierHz);
  }, [presets, isManualLock, binauralVol, droneVol]);

  const scrubTimeline = useCallback((sec: number) => {
    const totalSec = stagesRef.current.reduce((acc, s) => acc + Math.max(0.5, s.durationMin) * 60, 0);
    const clamped = Math.max(0, Math.min(sec, totalSec));
    setSessionElapsedSec(clamped);
    elapsedRef.current = clamped;

    if (isManualLockRef.current) {
      setIsManualLock(false);
    }

    const state = computeSequenceStateAtTime(clamped, stagesRef.current);
    setBeatHz(state.beatHz);
    setCarrierHz(state.carrierHz);
    audioEngine.setFrequencies(state.beatHz, state.carrierHz);
  }, []);

  const resetTimeline = useCallback(() => {
    scrubTimeline(0);
  }, [scrubTimeline]);

  const toggleManualLock = useCallback(() => {
    setIsManualLock(prev => !prev);
  }, []);

  const setManualBeat = useCallback((hz: number) => {
    if (!isManualLock) setIsManualLock(true);
    setBeatHz(hz);
    audioEngine.setFrequencies(hz, carrierHz);
  }, [isManualLock, carrierHz]);

  const setManualCarrier = useCallback((hz: number) => {
    if (!isManualLock) setIsManualLock(true);
    setCarrierHz(hz);
    audioEngine.setFrequencies(beatHz, hz);
  }, [isManualLock, beatHz]);

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
    setStages(normalized);
    const state = computeSequenceStateAtTime(elapsedRef.current, normalized);
    if (!isManualLockRef.current) {
      setBeatHz(state.beatHz);
      setCarrierHz(state.carrierHz);
      audioEngine.setFrequencies(state.beatHz, state.carrierHz);
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
    } catch (e) {
      return false;
    }
  }, [noiseType, noiseVol, noiseCutoff, droneMode]);

  const totalSec = stages.reduce((acc, s) => acc + Math.max(0.5, s.durationMin) * 60, 0);
  const computedState = computeSequenceStateAtTime(sessionElapsedSec, stages);

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
    activePreset: presets[activePresetIndex] || presets[0],
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
