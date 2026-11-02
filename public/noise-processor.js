/**
 * AudioWorklet Processor for real-time mathematical procedural Pink and Brown noise.
 * Runs on the dedicated audio rendering thread for zero-latency, stutter-free masking.
 */
class NoiseProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'noiseType',
        defaultValue: 2, // 0 = off, 1 = pink, 2 = brown
        minValue: 0,
        maxValue: 2,
        automationRate: 'k-rate'
      }
    ];
  }

  constructor() {
    super();
    // Pink Noise filter state (Paul Kellet's refined 7-pole approximation)
    this.b0 = 0.0;
    this.b1 = 0.0;
    this.b2 = 0.0;
    this.b3 = 0.0;
    this.b4 = 0.0;
    this.b5 = 0.0;
    this.b6 = 0.0;

    // Brown Noise leaky integrator state
    this.lastBrownOut = 0.0;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const outL = output[0];
    const outR = output[1] || output[0];
    const noiseTypeParam = parameters.noiseType;
    const type = noiseTypeParam.length > 0 ? Math.round(noiseTypeParam[0]) : 2;

    if (type === 0) {
      outL.fill(0);
      if (output[1]) outR.fill(0);
      return true;
    }

    const bufferLen = outL.length;

    for (let i = 0; i < bufferLen; i++) {
      const white = Math.random() * 2 - 1;
      let sample = 0;

      if (type === 1) {
        // Paul Kellet's Pink Noise method
        this.b0 = 0.99886 * this.b0 + white * 0.0555179;
        this.b1 = 0.99332 * this.b1 + white * 0.0750759;
        this.b2 = 0.96900 * this.b2 + white * 0.1538520;
        this.b3 = 0.86650 * this.b3 + white * 0.3104856;
        this.b4 = 0.55000 * this.b4 + white * 0.5329522;
        this.b5 = -0.7616 * this.b5 - white * 0.0168980;
        sample = (this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362) * 0.04;
        this.b6 = white * 0.115926;
      } else {
        // Deep Brown Noise (leaky integrator - 6dB/octave rolloff)
        this.lastBrownOut = (this.lastBrownOut + (0.02 * white)) / 1.02;
        sample = this.lastBrownOut * 0.85;
      }

      // Output with subtle decorrelation between stereo channels for spaciousness
      outL[i] = sample;
      if (output[1]) {
        outR[i] = sample * 0.98 + (Math.random() * 2 - 1) * 0.004;
      }
    }

    return true;
  }
}

registerProcessor('noise-processor', NoiseProcessor);
