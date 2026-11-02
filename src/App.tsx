import React, { useState, useEffect, useCallback } from 'react';
import { Edit3, RotateCcw } from 'lucide-react';
import { useAudioSession } from './hooks/useAudioSession';
import { useWakeLock } from './hooks/useWakeLock';
import { Header } from './components/Header';
import { TransportBar } from './components/TransportBar';
import { TimelineCanvas } from './components/Visualizers/TimelineCanvas';
import { WaveformCanvas } from './components/Visualizers/WaveformCanvas';
import { LissajousCanvas } from './components/Visualizers/LissajousCanvas';
import { StageTable } from './components/StageEditor/StageTable';
import { PresetList } from './components/Presets/PresetList';
import { ManualLockCard } from './components/ManualControl/ManualLockCard';
import { MixerSection } from './components/Mixer/MixerSection';
import { AcousticAdvisory } from './components/Diagnostics/AcousticAdvisory';
import { Toast } from './components/UI/Toast';
import { audioEngine } from './audio/AudioEngine';

export const App: React.FC = () => {
  const {
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
  } = useAudioSession();

  const { isLocked: isWakeLocked, toggleWakeLock } = useWakeLock();

  const [isStageEditorOpen, setIsStageEditorOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleToggleWakeLock = async () => {
    const res = await toggleWakeLock();
    showToast(res.message);
  };

  const handleSaveToBrowser = () => {
    const ok = saveCustomPreset(stages);
    if (ok) {
      showToast('Custom sequence saved to browser storage!');
    } else {
      showToast('Could not save to browser storage.');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleManualLock();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        resetTimeline();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, toggleManualLock, resetTimeline]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-sky-500/30 selection:text-sky-200 flex flex-col">
      <Header
        earIsolation={earIsolation}
        onSetEarIsolation={setEarIsolation}
        isWakeLocked={isWakeLocked}
        onToggleWakeLock={handleToggleWakeLock}
        onShowMessage={showToast}
        isUsingWorklet={audioEngine.getIsUsingWorklet()}
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visualizers, Transport & Timeline Sequencer (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <TransportBar
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            presetName={activePreset.name}
            telemetry={telemetry}
            isManualLock={isManualLock}
          />

          {/* Interactive Multi-Stage Timeline Graph */}
          <section className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
                  <span>Multi-Stage Entrainment Timeline</span>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                      isManualLock
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {isManualLock ? 'Static Manual Override' : 'Dynamic Sequence'}
                  </span>
                  <span className="flex items-center gap-3 text-[11px] font-mono ml-1">
                    <span className="flex items-center gap-1 text-sky-400">
                      <span className="w-2.5 h-0.5 bg-sky-400 inline-block" />
                      Beat (Hz)
                    </span>
                    <span className="flex items-center gap-1 text-indigo-400">
                      <span className="w-2.5 h-0.5 border-b border-dashed border-indigo-400 inline-block" />
                      Carrier (Hz)
                    </span>
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Click or drag anywhere on the curve to scrub through Beat & Carrier ramps
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetTimeline}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restart (0:00)</span>
                </button>
                <button
                  onClick={() => setIsStageEditorOpen(prev => !prev)}
                  className="px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-medium transition flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isStageEditorOpen ? 'Hide Editor' : 'Edit Stages'}</span>
                </button>
              </div>
            </div>

            <TimelineCanvas
              stages={stages}
              elapsedSec={telemetry.elapsedSec}
              totalSec={telemetry.totalSec}
              currentBeatHz={telemetry.beatHz}
              currentCarrierHz={telemetry.carrierHz}
              onScrub={scrubTimeline}
            />

            {isStageEditorOpen && (
              <StageTable
                stages={stages}
                onUpdateStages={updateStages}
                onSaveToBrowser={handleSaveToBrowser}
              />
            )}
          </section>

          {/* Dual-Wave Interference & Lissajous Phase Oscilloscope */}
          <section className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Real-Time Binaural Phase Interference & Envelope
                </h2>
                <p className="text-xs text-slate-400">
                  Visualizing Left/Right sine displacement and mathematical amplitude modulation
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  L
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  R
                </span>
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  Beat Sum
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <WaveformCanvas
                currentBeatHz={telemetry.beatHz}
                currentCarrierHz={telemetry.carrierHz}
                isPlaying={isPlaying}
                earIsolation={earIsolation}
              />
              <LissajousCanvas
                currentBeatHz={telemetry.beatHz}
                currentCarrierHz={telemetry.carrierHz}
                isPlaying={isPlaying}
                earIsolation={earIsolation}
              />
            </div>
          </section>
        </div>

        {/* Right Column: Presets, Manual Override & Procedural Mixer (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <PresetList
            presets={presets}
            activePresetIndex={activePresetIndex}
            onSelectPreset={selectPreset}
          />

          <ManualLockCard
            isManualLock={isManualLock}
            onToggleManualLock={toggleManualLock}
            beatHz={telemetry.beatHz}
            carrierHz={telemetry.carrierHz}
            onSetBeatHz={setManualBeat}
            onSetCarrierHz={setManualCarrier}
          />

          <MixerSection
            binauralVol={binauralVol}
            onSetBinauralVol={setBinauralVol}
            noiseType={noiseType}
            onSetNoiseType={setNoiseType}
            noiseVol={noiseVol}
            onSetNoiseVol={setNoiseVol}
            noiseCutoff={noiseCutoff}
            onSetNoiseCutoff={setNoiseCutoff}
            droneMode={droneMode}
            onSetDroneMode={setDroneMode}
            droneVol={droneVol}
            onSetDroneVol={setDroneVol}
          />

          <AcousticAdvisory />
        </div>
      </main>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
};

export default App;
