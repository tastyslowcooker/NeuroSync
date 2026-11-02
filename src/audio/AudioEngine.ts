import { DroneMode, EarIsolation, NoiseType } from '../types/audio';
import { Stage } from '../types/preset';

/**
 * Generates an in-memory stereo 16-bit PCM WAV data URL containing a sub-audible
 * (-84 dBFS, 2-LSB at 20 Hz) seamless loop.
 *
 * Mobile browsers (iOS Safari < 17 and Android Chrome) suspend standalone Web Audio
 * contexts when the screen locks or the app is backgrounded unless an HTMLMediaElement
 * with non-zero signal is actively playing in a media playback session.
 * Keeping this element separate from the Web Audio graph preserves 100% pure,
 * bit-accurate stereo separation for binaural beats.
 */
function createKeepAliveWavUrl(): string {
  const sampleRate = 8000;
  const numChannels = 2;
  const numFrames = sampleRate; // 1.0 second exact seamless loop
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    // 20 Hz integer-cycle wave at 2 LSBs (-84 dBFS): zero-crosses cleanly at loop boundaries,
    // completely inaudible, yet satisfies mobile OS non-silent background audio checks.
    const sample = Math.round(Math.sin((2 * Math.PI * 20 * i) / sampleRate) * 2);
    view.setInt16(offset, sample, true);
    view.setInt16(offset + 2, sample, true);
    offset += 4;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private initPromise: Promise<void> | null = null;
  private pauseSuspendTimer: ReturnType<typeof setTimeout> | null = null;

  // Mobile background keep-alive media element
  private keepAliveAudio: HTMLAudioElement | null = null;
  private keepAliveUrl: string | null = null;

  // Binaural Sine Nodes
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private leftPanner: StereoPannerNode | null = null;
  private rightPanner: StereoPannerNode | null = null;
  private leftEarGain: GainNode | null = null;
  private rightEarGain: GainNode | null = null;
  private binauralMasterGain: GainNode | null = null;

  // Harmonic Drone Nodes
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

  // Noise Nodes
  private noiseWorkletNode: AudioWorkletNode | null = null;
  private noiseScriptNode: ScriptProcessorNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private isUsingWorklet = false;

  // Analyser node for visualizers (wave & spectrum)
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // ScriptProcessor fallback state variables
  private b0 = 0; private b1 = 0; private b2 = 0;
  private b3 = 0; private b4 = 0; private b5 = 0; private b6 = 0;
  private lastBrownOut = 0;

  // Engine state cache
  private isPlaying = false;
  private currentBeatHz = 12.0;
  private currentCarrierHz = 180.0;
  private earIsolation: EarIsolation = 'both';
  private noiseType: NoiseType = 'brown';
  private droneMode: DroneMode = 'octave';

  private binauralVol = 0.65;
  private noiseVol = 0.35;
  private noiseCutoffHz = 420;
  private droneVol = 0.20;

  // Hardware-clocked sequence scheduling state
  private activeStages: Stage[] = [];
  private sequenceAnchorElapsedSec = 0;
  private sequenceAnchorAudioTime = 0;
  private sequenceManualLock = false;
  private scheduledLoopIndex = 0;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityOrPageResume);
      window.addEventListener('pageshow', this.handleVisibilityOrPageResume);
    }
  }

  private handleVisibilityOrPageResume = (): void => {
    if (this.isPlaying) {
      this.ensureRunning();
    }
  };

  /**
   * Configures iOS 16.4+ / Safari navigator.audioSession to 'playback' so Web Audio
   * continues playing when the phone is locked, backgrounded, or on hardware Silent mode.
   */
  private configurePlatformAudioSession(): void {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as Navigator & {
      audioSession?: { type: string };
    };
    if (nav.audioSession) {
      try {
        nav.audioSession.type = 'playback';
      } catch {
        // Ignore if unsupported
      }
    }
  }

  private ensureKeepAliveElement(): HTMLAudioElement | null {
    if (typeof document === 'undefined') return null;
    if (!this.keepAliveAudio) {
      this.keepAliveUrl = createKeepAliveWavUrl();
      const audio = document.createElement('audio');
      audio.src = this.keepAliveUrl;
      audio.loop = true;
      audio.preload = 'auto';
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.style.display = 'none';
      document.body.appendChild(audio);
      this.keepAliveAudio = audio;
    }
    return this.keepAliveAudio;
  }

  private startKeepAliveAudio(): void {
    const audio = this.ensureKeepAliveElement();
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {
        // Ignored if blocked outside user gesture; retried on next interaction
      });
    }
  }

  private stopKeepAliveAudio(): void {
    if (this.keepAliveAudio && !this.keepAliveAudio.paused) {
      this.keepAliveAudio.pause();
    }
  }

  public ensureRunning(): void {
    if (!this.isPlaying) return;
    this.configurePlatformAudioSession();
    this.startKeepAliveAudio();
    if (this.ctx) {
      const state = this.ctx.state as string;
      if (state === 'suspended' || state === 'interrupted') {
        this.ctx.resume().catch(() => {});
      }
    }
  }

  public init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.configurePlatformAudioSession();

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    try {
      this.ctx = new AudioContextClass({ latencyHint: 'playback' });
    } catch {
      this.ctx = new AudioContextClass();
    }

    // Automatically recover if mobile OS interrupts/suspends context while playing
    this.ctx.addEventListener('statechange', () => {
      if (!this.ctx || !this.isPlaying) return;
      const state = this.ctx.state as string;
      if (state === 'suspended' || state === 'interrupted') {
        this.ctx.resume().catch(() => {});
      }
    });

    // Master bus & analyser
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Master Binaural Gain (initial gain 0 to prevent click)
    this.binauralMasterGain = this.ctx.createGain();
    this.binauralMasterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.binauralMasterGain.connect(this.masterGain);

    // Left and Right ear gains for channel isolation test
    this.leftEarGain = this.ctx.createGain();
    this.rightEarGain = this.ctx.createGain();
    this.leftEarGain.gain.setValueAtTime(this.earIsolation === 'left' ? 0.0 : 1.0, this.ctx.currentTime);
    this.rightEarGain.gain.setValueAtTime(this.earIsolation === 'right' ? 0.0 : 1.0, this.ctx.currentTime);
    this.leftEarGain.connect(this.binauralMasterGain);
    this.rightEarGain.connect(this.binauralMasterGain);

    // Stereo Panners
    this.leftPanner = this.ctx.createStereoPanner();
    this.rightPanner = this.ctx.createStereoPanner();
    this.leftPanner.pan.setValueAtTime(-1.0, this.ctx.currentTime);
    this.rightPanner.pan.setValueAtTime(1.0, this.ctx.currentTime);
    this.leftPanner.connect(this.leftEarGain);
    this.rightPanner.connect(this.rightEarGain);

    // Oscillators
    this.leftOsc = this.ctx.createOscillator();
    this.rightOsc = this.ctx.createOscillator();
    this.leftOsc.type = 'sine';
    this.rightOsc.type = 'sine';

    const leftFreq = Math.max(20, this.currentCarrierHz - this.currentBeatHz / 2);
    const rightFreq = Math.max(20, this.currentCarrierHz + this.currentBeatHz / 2);
    this.leftOsc.frequency.setValueAtTime(leftFreq, this.ctx.currentTime);
    this.rightOsc.frequency.setValueAtTime(rightFreq, this.ctx.currentTime);

    this.leftOsc.connect(this.leftPanner);
    this.rightOsc.connect(this.rightPanner);
    this.leftOsc.start();
    this.rightOsc.start();

    // Drone Oscillator
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.droneGain.connect(this.masterGain);

    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sine';
    const droneFactor = this.droneMode === 'fifth' ? 1.5 : 0.5;
    this.droneOsc.frequency.setValueAtTime(this.currentCarrierHz * droneFactor, this.ctx.currentTime);
    this.droneOsc.connect(this.droneGain);
    this.droneOsc.start();

    // Noise Filter & Gain
    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.frequency.setValueAtTime(this.noiseCutoffHz, this.ctx.currentTime);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    // Load AudioWorklet asynchronously after synchronous node graph construction
    this.initPromise = this.initNoiseSource();
    return this.initPromise;
  }

  private async initNoiseSource(): Promise<void> {
    if (!this.ctx || !this.noiseFilter) return;

    if (this.ctx.audioWorklet) {
      try {
        await this.ctx.audioWorklet.addModule('/noise-processor.js');
        if (!this.ctx || !this.noiseFilter) return;
        this.noiseWorkletNode = new AudioWorkletNode(this.ctx, 'noise-processor', {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2]
        });

        this.setWorkletNoiseType(this.noiseType);
        this.noiseWorkletNode.connect(this.noiseFilter);
        this.isUsingWorklet = true;
        return;
      } catch (err) {
        console.warn('AudioWorklet module load failed; falling back to ScriptProcessor:', err);
      }
    }

    // Fallback: ScriptProcessorNode
    this.initScriptProcessorFallback();
  }

  private initScriptProcessorFallback(): void {
    if (!this.ctx || !this.noiseFilter) return;

    const bufferSize = 4096;
    this.noiseScriptNode = this.ctx.createScriptProcessor(bufferSize, 1, 2);
    this.noiseScriptNode.onaudioprocess = (e) => {
      const outL = e.outputBuffer.getChannelData(0);
      const outR = e.outputBuffer.getChannelData(1);

      if (this.noiseType === 'off') {
        outL.fill(0);
        outR.fill(0);
        return;
      }

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        let sample = 0;

        if (this.noiseType === 'pink') {
          this.b0 = 0.99886 * this.b0 + white * 0.0555179;
          this.b1 = 0.99332 * this.b1 + white * 0.0750759;
          this.b2 = 0.96900 * this.b2 + white * 0.1538520;
          this.b3 = 0.86650 * this.b3 + white * 0.3104856;
          this.b4 = 0.55000 * this.b4 + white * 0.5329522;
          this.b5 = -0.7616 * this.b5 - white * 0.0168980;
          sample = (this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362) * 0.04;
          this.b6 = white * 0.115926;
        } else {
          this.lastBrownOut = (this.lastBrownOut + (0.02 * white)) / 1.02;
          sample = this.lastBrownOut * 0.85;
        }

        outL[i] = sample;
        outR[i] = sample * 0.98 + (Math.random() * 2 - 1) * 0.004;
      }
    };

    this.noiseScriptNode.connect(this.noiseFilter);
  }

  private setWorkletNoiseType(type: NoiseType): void {
    if (!this.noiseWorkletNode || !this.ctx) return;
    const param = this.noiseWorkletNode.parameters.get('noiseType');
    if (param) {
      const num = type === 'off' ? 0 : type === 'pink' ? 1 : 2;
      param.setValueAtTime(num, this.ctx.currentTime);
    }
  }

  public async play(stages?: Stage[], elapsedSec?: number, isManualLock?: boolean): Promise<void> {
    if (this.pauseSuspendTimer) {
      clearTimeout(this.pauseSuspendTimer);
      this.pauseSuspendTimer = null;
    }

    this.isPlaying = true;

    // Must run synchronously inside user gesture call stack for iOS Safari / Android Chrome
    this.configurePlatformAudioSession();
    this.startKeepAliveAudio();

    const initTask = this.init();
    if (this.ctx) {
      const state = this.ctx.state as string;
      if (state === 'suspended' || state === 'interrupted') {
        this.ctx.resume().catch(() => {});
      }
    }

    await initTask;

    if (this.ctx && this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        // Will retry on visibilitychange / statechange if interrupted
      }
    }

    if (!this.isPlaying) return;

    if (stages !== undefined && elapsedSec !== undefined && isManualLock !== undefined) {
      this.scheduleSequence(stages, elapsedSec, isManualLock);
    } else if (this.activeStages.length > 0 && !this.sequenceManualLock) {
      this.scheduleSequence(this.activeStages, this.sequenceAnchorElapsedSec, false);
    } else {
      this.syncFrequencies();
    }

    this.updateGains();
  }

  public pause(): void {
    if (this.isPlaying) {
      this.sequenceAnchorElapsedSec = this.getSequenceElapsedSec();
    }
    this.isPlaying = false;
    this.stopKeepAliveAudio();

    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Cancel future frequency automation and hold current pitches during fade-out
    this.cancelFrequencySchedule(now);

    // Smooth click-free fade to silence
    this.binauralMasterGain?.gain.setTargetAtTime(0.0001, now, 0.06);
    this.noiseGain?.gain.setTargetAtTime(0.0001, now, 0.06);
    this.droneGain?.gain.setTargetAtTime(0.0001, now, 0.06);

    // Suspend context once fade-out finishes to save mobile battery when paused
    if (this.pauseSuspendTimer) {
      clearTimeout(this.pauseSuspendTimer);
    }
    this.pauseSuspendTimer = setTimeout(() => {
      this.pauseSuspendTimer = null;
      if (!this.isPlaying && this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    }, 350);
  }

  private getChannelFreqs(beatHz: number, carrierHz: number) {
    const leftFreq = Math.max(20, carrierHz - beatHz / 2);
    const rightFreq = Math.max(20, carrierHz + beatHz / 2);
    const droneFactor = this.droneMode === 'fifth' ? 1.5 : 0.5;
    const droneFreq = carrierHz * droneFactor;
    return { leftFreq, rightFreq, droneFreq };
  }

  private cancelFrequencySchedule(now: number): void {
    if (!this.leftOsc || !this.rightOsc || !this.droneOsc) return;
    const lVal = this.leftOsc.frequency.value;
    const rVal = this.rightOsc.frequency.value;
    const dVal = this.droneOsc.frequency.value;

    this.leftOsc.frequency.cancelScheduledValues(now);
    this.rightOsc.frequency.cancelScheduledValues(now);
    this.droneOsc.frequency.cancelScheduledValues(now);

    this.leftOsc.frequency.setValueAtTime(lVal, now);
    this.rightOsc.frequency.setValueAtTime(rVal, now);
    this.droneOsc.frequency.setValueAtTime(dVal, now);
  }

  /**
   * Schedules multi-stage carrier and beat frequency ramps directly onto the Web Audio
   * hardware AudioParam timeline so entrainment stages continue ramping with sample
   * accuracy even when mobile browsers throttle or freeze JS timers on a locked screen.
   */
  public scheduleSequence(stages: Stage[], elapsedSec: number, isManualLock: boolean): void {
    this.activeStages = stages;
    this.sequenceManualLock = isManualLock;

    const totalSec = stages.reduce((acc, s) => acc + Math.max(0.5, s.durationMin) * 60, 0);
    const clampedSec = totalSec > 0 ? Math.max(0, Math.min(elapsedSec, totalSec)) : 0;

    this.sequenceAnchorElapsedSec = clampedSec;
    this.sequenceAnchorAudioTime = this.ctx ? this.ctx.currentTime : 0;
    this.scheduledLoopIndex = 0;

    if (isManualLock || stages.length === 0 || totalSec <= 0) {
      this.syncFrequencies();
      return;
    }

    // Compute current stage and interpolated frequencies at clampedSec
    let accumulated = 0;
    let startStageIdx = 0;
    let localOffsetSec = 0;

    for (let i = 0; i < stages.length; i++) {
      const dur = Math.max(0.5, stages[i].durationMin) * 60;
      if (clampedSec < accumulated + dur || i === stages.length - 1) {
        startStageIdx = i;
        localOffsetSec = Math.min(dur, Math.max(0, clampedSec - accumulated));
        break;
      }
      accumulated += dur;
    }

    const s0 = stages[startStageIdx];
    const dur0 = Math.max(0.5, s0.durationMin) * 60;
    const p0 = dur0 > 0 ? localOffsetSec / dur0 : 0;
    this.currentBeatHz = s0.startBeat + (s0.endBeat - s0.startBeat) * p0;
    this.currentCarrierHz = s0.startCarrier + (s0.endCarrier - s0.startCarrier) * p0;

    if (!this.ctx || !this.leftOsc || !this.rightOsc || !this.droneOsc || !this.isPlaying) {
      this.syncFrequencies();
      return;
    }

    this.applyStageAutomationFrom(stages, startStageIdx, localOffsetSec);
  }

  private applyStageAutomationFrom(stages: Stage[], startStageIdx: number, localOffsetSec: number): void {
    if (!this.ctx || !this.leftOsc || !this.rightOsc || !this.droneOsc) return;

    const now = this.ctx.currentTime;
    this.cancelFrequencySchedule(now);

    const s0 = stages[startStageIdx];
    const dur0 = Math.max(0.5, s0.durationMin) * 60;
    const p0 = dur0 > 0 ? localOffsetSec / dur0 : 0;
    const curBeat = s0.startBeat + (s0.endBeat - s0.startBeat) * p0;
    const curCarrier = s0.startCarrier + (s0.endCarrier - s0.startCarrier) * p0;
    const curFreqs = this.getChannelFreqs(curBeat, curCarrier);

    // Smooth 50ms glide to exact current point on the timeline
    const glideEnd = now + 0.05;
    this.leftOsc.frequency.linearRampToValueAtTime(curFreqs.leftFreq, glideEnd);
    this.rightOsc.frequency.linearRampToValueAtTime(curFreqs.rightFreq, glideEnd);
    this.droneOsc.frequency.linearRampToValueAtTime(curFreqs.droneFreq, glideEnd);

    // Finish current stage
    const rem0 = Math.max(0, dur0 - localOffsetSec);
    let tCursor = now + rem0;
    const end0Freqs = this.getChannelFreqs(s0.endBeat, s0.endCarrier);
    if (tCursor > glideEnd) {
      this.leftOsc.frequency.linearRampToValueAtTime(end0Freqs.leftFreq, tCursor);
      this.rightOsc.frequency.linearRampToValueAtTime(end0Freqs.rightFreq, tCursor);
      this.droneOsc.frequency.linearRampToValueAtTime(end0Freqs.droneFreq, tCursor);
    } else {
      tCursor = glideEnd;
    }

    const scheduleStage = (stage: Stage) => {
      if (!this.leftOsc || !this.rightOsc || !this.droneOsc) return;
      const dur = Math.max(0.5, stage.durationMin) * 60;
      const startFreqs = this.getChannelFreqs(stage.startBeat, stage.startCarrier);
      const endFreqs = this.getChannelFreqs(stage.endBeat, stage.endCarrier);

      const stepEnd = tCursor + Math.min(0.05, dur * 0.1);
      this.leftOsc.frequency.linearRampToValueAtTime(startFreqs.leftFreq, stepEnd);
      this.rightOsc.frequency.linearRampToValueAtTime(startFreqs.rightFreq, stepEnd);
      this.droneOsc.frequency.linearRampToValueAtTime(startFreqs.droneFreq, stepEnd);

      tCursor += dur;
      this.leftOsc.frequency.linearRampToValueAtTime(endFreqs.leftFreq, tCursor);
      this.rightOsc.frequency.linearRampToValueAtTime(endFreqs.rightFreq, tCursor);
      this.droneOsc.frequency.linearRampToValueAtTime(endFreqs.droneFreq, tCursor);
    };

    // Remaining stages in the current cycle
    for (let j = startStageIdx + 1; j < stages.length; j++) {
      scheduleStage(stages[j]);
    }

    // Pre-schedule one full subsequent cycle so loop wraparound is seamless even while locked
    for (let j = 0; j < stages.length; j++) {
      scheduleStage(stages[j]);
    }
  }

  /**
   * Returns exact hardware-clocked elapsed seconds in the current sequence,
   * extending the scheduled loop horizon if a cycle boundary was crossed.
   */
  public getSequenceElapsedSec(): number {
    if (!this.isPlaying || this.sequenceManualLock || !this.ctx || this.activeStages.length === 0) {
      return this.sequenceAnchorElapsedSec;
    }

    const totalSec = this.activeStages.reduce((acc, s) => acc + Math.max(0.5, s.durationMin) * 60, 0);
    if (totalSec <= 0) return 0;

    const audioDelta = Math.max(0, this.ctx.currentTime - this.sequenceAnchorAudioTime);
    const totalElapsed = this.sequenceAnchorElapsedSec + audioDelta;
    const currentLoopIndex = Math.floor(totalElapsed / totalSec);
    const wrappedElapsed = totalElapsed % totalSec;

    // Re-extend hardware schedule whenever a full sequence cycle wraps
    if (currentLoopIndex > this.scheduledLoopIndex) {
      this.scheduledLoopIndex = currentLoopIndex;
      this.sequenceAnchorElapsedSec = wrappedElapsed;
      this.sequenceAnchorAudioTime = this.ctx.currentTime;
      this.scheduledLoopIndex = 0;
      this.scheduleSequence(this.activeStages, wrappedElapsed, false);
    }

    return wrappedElapsed;
  }

  public setFrequencies(beatHz: number, carrierHz: number): void {
    this.currentBeatHz = beatHz;
    this.currentCarrierHz = carrierHz;
    this.sequenceManualLock = true;
    this.syncFrequencies();
  }

  private syncFrequencies(): void {
    if (!this.ctx || !this.leftOsc || !this.rightOsc || !this.droneOsc) return;
    const now = this.ctx.currentTime;

    this.cancelFrequencySchedule(now);

    const { leftFreq, rightFreq, droneFreq } = this.getChannelFreqs(
      this.currentBeatHz,
      this.currentCarrierHz
    );

    this.leftOsc.frequency.setTargetAtTime(leftFreq, now, 0.05);
    this.rightOsc.frequency.setTargetAtTime(rightFreq, now, 0.05);
    this.droneOsc.frequency.setTargetAtTime(droneFreq, now, 0.08);
  }

  public updateGains(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (!this.isPlaying) {
      this.binauralMasterGain?.gain.setTargetAtTime(0.0001, now, 0.05);
      this.noiseGain?.gain.setTargetAtTime(0.0001, now, 0.05);
      this.droneGain?.gain.setTargetAtTime(0.0001, now, 0.05);
      return;
    }

    // Binaural master gain scaled cleanly
    this.binauralMasterGain?.gain.setTargetAtTime(this.binauralVol * 0.35, now, 0.05);

    // Noise gain & filter
    const targetNoiseGain = this.noiseType === 'off' ? 0.0001 : this.noiseVol * 0.40;
    this.noiseGain?.gain.setTargetAtTime(targetNoiseGain, now, 0.05);
    this.noiseFilter?.frequency.setTargetAtTime(this.noiseCutoffHz, now, 0.05);

    // Drone gain
    const targetDroneGain = this.droneMode === 'off' ? 0.0001 : this.droneVol * 0.14;
    this.droneGain?.gain.setTargetAtTime(targetDroneGain, now, 0.05);
  }

  public setMixerLevels(binauralVol: number, noiseVol: number, noiseCutoff: number, droneVol: number): void {
    this.binauralVol = Math.max(0, Math.min(1, binauralVol));
    this.noiseVol = Math.max(0, Math.min(1, noiseVol));
    this.noiseCutoffHz = Math.max(80, Math.min(2500, noiseCutoff));
    this.droneVol = Math.max(0, Math.min(1, droneVol));

    this.updateGains();
  }

  public setNoiseType(type: NoiseType): void {
    this.noiseType = type;
    if (this.isUsingWorklet) {
      this.setWorkletNoiseType(type);
    }
    this.updateGains();
  }

  public setDroneMode(mode: DroneMode): void {
    this.droneMode = mode;
    if (this.isPlaying && !this.sequenceManualLock && this.activeStages.length > 0) {
      const currentElapsed = this.getSequenceElapsedSec();
      this.scheduleSequence(this.activeStages, currentElapsed, false);
    } else {
      this.syncFrequencies();
    }
    this.updateGains();
  }

  public setEarIsolation(mode: EarIsolation): void {
    this.earIsolation = mode;
    if (!this.ctx || !this.leftEarGain || !this.rightEarGain) return;
    const now = this.ctx.currentTime;

    // 'left' isolation means mute left ear; 'right' means mute right ear
    this.leftEarGain.gain.setTargetAtTime(mode === 'left' ? 0.0 : 1.0, now, 0.04);
    this.rightEarGain.gain.setTargetAtTime(mode === 'right' ? 0.0 : 1.0, now, 0.04);
  }

  public getEarIsolation(): EarIsolation {
    return this.earIsolation;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsUsingWorklet(): boolean {
    return this.isUsingWorklet;
  }

  public dispose(): void {
    if (this.pauseSuspendTimer) {
      clearTimeout(this.pauseSuspendTimer);
      this.pauseSuspendTimer = null;
    }
    this.stopKeepAliveAudio();
    if (this.keepAliveAudio) {
      this.keepAliveAudio.remove();
      this.keepAliveAudio = null;
    }
    if (this.keepAliveUrl) {
      URL.revokeObjectURL(this.keepAliveUrl);
      this.keepAliveUrl = null;
    }
    if (this.ctx) {
      try {
        this.isPlaying = false;
        this.leftOsc?.stop();
        this.rightOsc?.stop();
        this.droneOsc?.stop();
        this.ctx.close();
      } catch {
        // Safe dispose
      }
      this.ctx = null;
      this.initPromise = null;
    }
  }
}

// Global Singleton for the Web Audio Context
export const audioEngine = new AudioEngine();
