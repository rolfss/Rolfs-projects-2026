export class AudioEngine {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.master = null;
    this.sfxBus = null;
    this.ambientBus = null;
    this.noiseBuffer = null;
    this.ambientNodes = [];
    this.pulseTimer = 0;
    this.stage = 1;
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return this.context;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    const context = new AudioContextClass();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.22;

    const master = context.createGain();
    master.gain.value = this.enabled ? 0.78 : 0.0001;
    const sfxBus = context.createGain();
    sfxBus.gain.value = 0.9;
    const ambientBus = context.createGain();
    ambientBus.gain.value = 0.14;

    sfxBus.connect(master);
    ambientBus.connect(master);
    master.connect(compressor);
    compressor.connect(context.destination);

    this.context = context;
    this.master = master;
    this.sfxBus = sfxBus;
    this.ambientBus = ambientBus;
    this.noiseBuffer = this.createNoiseBuffer();
    return context;
  }

  createNoiseBuffer() {
    const context = this.context;
    const length = Math.max(1, Math.floor(context.sampleRate * 0.45));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.82 + white * 0.18;
      data[index] = previous;
    }
    return buffer;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    const context = this.ensure();
    if (!context || !this.master) return;
    const now = context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
    this.master.gain.exponentialRampToValueAtTime(this.enabled ? 0.78 : 0.0001, now + 0.08);
  }

  createPanner(pan = 0) {
    const context = this.context;
    if (typeof context.createStereoPanner !== 'function') return null;
    const panner = context.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    return panner;
  }

  tone(
    frequency,
    duration,
    {
      type = 'triangle',
      gain = 0.035,
      delay = 0,
      endFrequency = null,
      pan = 0,
      bus = 'sfx',
    } = {},
  ) {
    if (!this.enabled) return;
    const context = this.ensure();
    if (!context) return;

    const start = context.currentTime + Math.max(0, delay);
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const panner = this.createPanner(pan);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + Math.min(0.012, duration * 0.25));
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(volume);
    if (panner) {
      volume.connect(panner);
      panner.connect(bus === 'ambient' ? this.ambientBus : this.sfxBus);
    } else {
      volume.connect(bus === 'ambient' ? this.ambientBus : this.sfxBus);
    }
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  noise(
    duration,
    {
      gain = 0.04,
      delay = 0,
      pan = 0,
      highpass = 80,
      lowpass = 7000,
    } = {},
  ) {
    if (!this.enabled) return;
    const context = this.ensure();
    if (!context || !this.noiseBuffer) return;

    const start = context.currentTime + Math.max(0, delay);
    const source = context.createBufferSource();
    const high = context.createBiquadFilter();
    const low = context.createBiquadFilter();
    const volume = context.createGain();
    const panner = this.createPanner(pan);

    source.buffer = this.noiseBuffer;
    high.type = 'highpass';
    high.frequency.value = highpass;
    low.type = 'lowpass';
    low.frequency.value = lowpass;
    volume.gain.setValueAtTime(Math.max(0.0001, gain), start);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(high);
    high.connect(low);
    low.connect(volume);
    if (panner) {
      volume.connect(panner);
      panner.connect(this.sfxBus);
    } else {
      volume.connect(this.sfxBus);
    }
    source.start(start);
    source.stop(start + Math.min(duration, this.noiseBuffer.duration));
  }

  startAmbient(stage = 1) {
    const context = this.ensure();
    if (!context || this.ambientNodes.length) {
      this.setStage(stage);
      return;
    }

    this.stage = stage;
    const fundamentals = [45, 49.5, 43, 38.5];
    const base = fundamentals[stage - 1] || fundamentals[0];

    for (const [ratio, gain] of [[1, 0.04], [1.5, 0.018], [2, 0.009]]) {
      const oscillator = context.createOscillator();
      const filter = context.createBiquadFilter();
      const volume = context.createGain();
      oscillator.type = ratio === 1 ? 'sine' : 'triangle';
      oscillator.frequency.value = base * ratio;
      filter.type = 'lowpass';
      filter.frequency.value = 310 + stage * 80;
      filter.Q.value = 0.8;
      volume.gain.value = gain;
      oscillator.connect(filter);
      filter.connect(volume);
      volume.connect(this.ambientBus);
      oscillator.start();
      this.ambientNodes.push({ oscillator, filter, volume, ratio });
    }

    this.schedulePulse();
  }

  schedulePulse() {
    window.clearTimeout(this.pulseTimer);
    if (!this.ambientNodes.length) return;

    const intervals = [1850, 1550, 1280, 1080];
    const delay = intervals[this.stage - 1] || intervals[0];
    this.pulseTimer = window.setTimeout(() => {
      if (this.enabled && this.ambientNodes.length) {
        const roots = [147, 165, 139, 123];
        const root = roots[this.stage - 1] || roots[0];
        this.tone(root, 0.12, { type: 'sine', gain: 0.012, bus: 'ambient', pan: -0.25 });
        this.tone(root * 1.5, 0.08, { type: 'triangle', gain: 0.008, delay: 0.06, bus: 'ambient', pan: 0.25 });
      }
      this.schedulePulse();
    }, delay);
  }

  setStage(stage) {
    this.stage = Math.max(1, Math.min(4, Number(stage) || 1));
    const context = this.ensure();
    if (!context || !this.ambientNodes.length) return;
    const base = [45, 49.5, 43, 38.5][this.stage - 1];
    const now = context.currentTime;
    for (const node of this.ambientNodes) {
      node.oscillator.frequency.cancelScheduledValues(now);
      node.oscillator.frequency.linearRampToValueAtTime(base * node.ratio, now + 0.7);
      node.filter.frequency.linearRampToValueAtTime(310 + this.stage * 80, now + 0.7);
    }
    this.schedulePulse();
  }

  stopAmbient() {
    window.clearTimeout(this.pulseTimer);
    this.pulseTimer = 0;
    for (const node of this.ambientNodes) {
      try {
        node.oscillator.stop();
      } catch {
        // It may already be stopped by the audio context.
      }
      node.oscillator.disconnect();
    }
    this.ambientNodes = [];
  }

  start() {
    [196, 294, 392, 588].forEach((frequency, index) => this.tone(frequency, 0.12, {
      type: index < 2 ? 'square' : 'triangle',
      gain: 0.027,
      delay: index * 0.075,
    }));
  }

  shot(pan = 0) {
    this.noise(0.105, { gain: 0.075, pan, highpass: 95, lowpass: 4800 });
    this.tone(118, 0.11, { type: 'sawtooth', gain: 0.06, endFrequency: 48, pan });
    this.tone(62, 0.15, { type: 'square', gain: 0.024, endFrequency: 31, pan });
  }

  hit(streak = 1, pan = 0, kind = 'normal') {
    const modifier = kind === 'priority' ? 1.12 : kind === 'legacy' ? 0.88 : kind === 'critical' ? 0.72 : 1;
    const base = (430 + Math.min(streak, 7) * 28) * modifier;
    this.tone(base, 0.09, { type: 'square', gain: 0.028, pan, endFrequency: base * 1.48 });
    this.tone(base * 1.5, 0.13, { type: 'triangle', gain: 0.018, delay: 0.035, pan });
  }

  miss(pan = 0) {
    this.tone(112, 0.12, { type: 'triangle', gain: 0.018, endFrequency: 76, pan });
  }

  nearMiss(pan = 0) {
    this.noise(0.18, { gain: 0.018, pan, highpass: 800, lowpass: 6000 });
    this.tone(260, 0.11, { type: 'sine', gain: 0.012, endFrequency: 190, pan });
  }

  escape(pan = 0) {
    this.tone(185, 0.12, { type: 'square', gain: 0.023, endFrequency: 118, pan });
    this.tone(116, 0.17, { type: 'square', gain: 0.018, delay: 0.1, endFrequency: 67, pan });
  }

  combo(streak) {
    const base = 315 + streak * 17;
    [1, 1.25, 1.5].forEach((ratio, index) => this.tone(base * ratio, 0.095, {
      type: 'triangle',
      gain: 0.023,
      delay: index * 0.055,
      pan: (index - 1) * 0.25,
    }));
  }

  stageUp(stage) {
    const base = [220, 247, 196, 165][stage - 1] || 220;
    [1, 1.25, 1.5, 2].forEach((ratio, index) => this.tone(base * ratio, 0.14, {
      type: index % 2 ? 'triangle' : 'square',
      gain: 0.025,
      delay: index * 0.075,
    }));
  }

  flow() {
    [262, 392, 523, 784].forEach((frequency, index) => this.tone(frequency, 0.19, {
      type: 'sine',
      gain: 0.024,
      delay: index * 0.055,
      pan: -0.45 + index * 0.3,
    }));
  }

  mission() {
    this.tone(523, 0.12, { type: 'triangle', gain: 0.021 });
    this.tone(784, 0.17, { type: 'triangle', gain: 0.024, delay: 0.08 });
  }

  quizOpen() {
    this.tone(260, 0.12, { type: 'sine', gain: 0.023, pan: -0.2 });
    this.tone(390, 0.14, { type: 'sine', gain: 0.021, delay: 0.08, pan: 0.2 });
  }

  quizCorrect() {
    [392, 523, 659, 784].forEach((frequency, index) => this.tone(frequency, 0.17, {
      type: 'triangle',
      gain: 0.026,
      delay: index * 0.07,
    }));
  }

  quizWrong() {
    this.tone(238, 0.2, { type: 'sawtooth', gain: 0.024, endFrequency: 116 });
    this.tone(105, 0.24, { type: 'square', gain: 0.018, delay: 0.12, endFrequency: 62 });
  }

  finalTarget() {
    this.noise(0.28, { gain: 0.025, highpass: 35, lowpass: 650 });
    [110, 82.5, 110].forEach((frequency, index) => this.tone(frequency, 0.22, {
      type: 'sawtooth',
      gain: 0.022,
      delay: index * 0.2,
    }));
  }

  win() {
    const melody = [392, 523, 659, 784, 988, 784, 988, 1175];
    melody.forEach((frequency, index) => this.tone(frequency, index === melody.length - 1 ? 0.55 : 0.17, {
      type: index % 2 ? 'triangle' : 'square',
      gain: 0.027,
      delay: index * 0.105,
      pan: Math.sin(index * 1.7) * 0.35,
    }));
  }
}
