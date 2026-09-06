import { SceneRenderer as BaseSceneRenderer } from './renderer-base.js';

const VISUAL_SAFETY_STYLE_ID = 'brukerstottejakten-no-blink';
const VISUAL_SAFETY_CSS = `
/* Accessibility: keep gameplay feedback visible without repetitive blinking. */
.radar-blip,
.flow-track.is-ready,
.weapon-rig.is-flow .gun-core,
.weapon-rig.is-overload .gun-screen,
.game-board.is-overload,
.gun-capacitor i,
.gun-energy-line {
  animation: none !important;
}
.radar-blip { opacity: 1 !important; transform: none !important; }
.weapon-rig.is-overload .gun-screen { filter: none !important; }
`;

function installVisualSafetyStyles() {
  if (typeof document === 'undefined' || document.getElementById(VISUAL_SAFETY_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = VISUAL_SAFETY_STYLE_ID;
  style.textContent = VISUAL_SAFETY_CSS;
  document.head.append(style);
}

class GrooveEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.timer = 0;
    this.step = 0;
    this.nextTime = 0;
    this.started = false;
    this.stepDuration = 60 / 112 / 4;
    this.noiseBuffer = null;
    this.bindControls();
  }

  bindControls() {
    if (typeof document === 'undefined') return;
    const deferSync = () => queueMicrotask(() => this.sync());
    const start = () => queueMicrotask(() => {
      this.started = true;
      this.sync();
    });

    ['#startButton', '#restartButton', '#resumeButton'].forEach((selector) => {
      document.querySelector(selector)?.addEventListener('click', start);
    });
    ['#musicButton', '#soundButton', '#pauseButton'].forEach((selector) => {
      document.querySelector(selector)?.addEventListener('click', deferSync);
    });

    const winOverlay = document.querySelector('#winOverlay');
    const pauseOverlay = document.querySelector('#pauseOverlay');
    if (typeof MutationObserver === 'function') {
      const observer = new MutationObserver(() => this.sync());
      [winOverlay, pauseOverlay].filter(Boolean).forEach((node) => {
        observer.observe(node, { attributes: true, attributeFilter: ['hidden', 'class'] });
      });
    }
    document.addEventListener('visibilitychange', () => this.sync());
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return this.context;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    const context = new AudioContextClass();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    master.gain.value = 0.16;
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;
    master.connect(compressor);
    compressor.connect(context.destination);
    this.context = context;
    this.master = master;
    this.noiseBuffer = this.createNoiseBuffer();
    return context;
  }

  createNoiseBuffer() {
    const context = this.context;
    if (!context) return null;
    const length = Math.floor(context.sampleRate * 0.25);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    return buffer;
  }

  controlPressed(selector) {
    return document.querySelector(selector)?.getAttribute('aria-pressed') !== 'false';
  }

  overlayVisible(selector) {
    const node = document.querySelector(selector);
    return Boolean(node && !node.hidden && node.classList.contains('is-visible'));
  }

  shouldPlay() {
    if (!this.started || document.hidden) return false;
    if (!this.controlPressed('#musicButton') || !this.controlPressed('#soundButton')) return false;
    if (this.overlayVisible('#pauseOverlay') || this.overlayVisible('#winOverlay')) return false;
    return true;
  }

  sync() {
    if (this.shouldPlay()) this.start();
    else this.stop();
  }

  start() {
    if (this.timer) return;
    const context = this.ensure();
    if (!context) return;
    this.step = 0;
    this.nextTime = context.currentTime + 0.05;
    this.scheduler();
    this.timer = window.setInterval(() => this.scheduler(), 25);
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
  }

  scheduler() {
    const context = this.context;
    if (!context || !this.shouldPlay()) {
      this.stop();
      return;
    }
    while (this.nextTime < context.currentTime + 0.12) {
      this.scheduleStep(this.step, this.nextTime);
      this.nextTime += this.stepDuration;
      this.step = (this.step + 1) % 16;
    }
  }

  envelope(gainNode, time, peak, duration, attack = 0.006) {
    gainNode.gain.setValueAtTime(0.0001, time);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  }

  oscillator(frequency, time, duration, { type = 'sine', gain = 0.2, endFrequency = null, filterFrequency = null, pan = 0 } = {}) {
    const context = this.context;
    if (!context || !this.master) return;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const filter = filterFrequency ? context.createBiquadFilter() : null;
    const panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    if (filter) {
      filter.type = 'lowpass';
      filter.frequency.value = filterFrequency;
      filter.Q.value = 1.2;
    }
    if (panner) panner.pan.value = pan;
    this.envelope(volume, time, gain, duration);
    oscillator.connect(filter || volume);
    if (filter) filter.connect(volume);
    if (panner) {
      volume.connect(panner);
      panner.connect(this.master);
    } else volume.connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
  }

  noise(time, duration, { gain = 0.12, highpass = 5000, pan = 0 } = {}) {
    const context = this.context;
    if (!context || !this.master || !this.noiseBuffer) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const volume = context.createGain();
    const panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
    source.buffer = this.noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    filter.Q.value = 0.7;
    if (panner) panner.pan.value = pan;
    this.envelope(volume, time, gain, duration, 0.002);
    source.connect(filter);
    filter.connect(volume);
    if (panner) {
      volume.connect(panner);
      panner.connect(this.master);
    } else volume.connect(this.master);
    source.start(time);
    source.stop(time + duration + 0.02);
  }

  kick(time, accent = 1) {
    this.oscillator(142, time, 0.16, { type: 'sine', gain: 0.72 * accent, endFrequency: 48 });
    this.oscillator(62, time, 0.11, { type: 'triangle', gain: 0.16 * accent, endFrequency: 42 });
  }

  snare(time) {
    this.noise(time, 0.12, { gain: 0.32, highpass: 1200, pan: 0.05 });
    this.oscillator(185, time, 0.09, { type: 'triangle', gain: 0.16, endFrequency: 125 });
  }

  hat(time, open = false, pan = 0) {
    this.noise(time, open ? 0.11 : 0.035, { gain: open ? 0.085 : 0.055, highpass: 6500, pan });
  }

  bass(frequency, time, accent = 1) {
    this.oscillator(frequency, time, 0.105, { type: 'sawtooth', gain: 0.18 * accent, filterFrequency: 520 });
    this.oscillator(frequency / 2, time, 0.13, { type: 'sine', gain: 0.1 * accent });
  }

  clav(time, variant = 0) {
    const chords = [
      [164.81, 196, 246.94],
      [146.83, 196, 220],
      [123.47, 164.81, 196],
      [146.83, 185, 220],
    ];
    const chord = chords[variant % chords.length];
    chord.forEach((frequency, index) => {
      this.oscillator(frequency * 2, time + index * 0.002, 0.075, {
        type: index === 1 ? 'triangle' : 'square',
        gain: 0.035,
        filterFrequency: 1800,
        pan: index === 0 ? -0.3 : index === 2 ? 0.3 : 0,
      });
    });
  }

  scheduleStep(step, time) {
    const bassLine = [82.41, null, 82.41, 98, null, 123.47, 110, null, 82.41, null, 146.83, 123.47, null, 110, 98, 123.47];
    if ([0, 4, 8, 12].includes(step)) this.kick(time, step === 0 ? 1.08 : 0.92);
    if (step === 10) this.kick(time, 0.5);
    if (step === 4 || step === 12) this.snare(time);
    if (step % 2 === 0) this.hat(time, false, step % 4 === 0 ? -0.18 : 0.18);
    if (step === 7 || step === 15) this.hat(time, true, 0.28);

    const bassNote = bassLine[step];
    if (bassNote) this.bass(bassNote, time + (step === 3 || step === 11 ? 0.018 : 0), step === 0 || step === 10 ? 1.12 : 0.9);

    if ([2, 5, 7, 10, 13, 15].includes(step)) {
      const chordVariant = step < 5 ? 0 : step < 9 ? 1 : step < 13 ? 2 : 3;
      this.clav(time + 0.012, chordVariant);
    }
  }
}

export class SceneRenderer extends BaseSceneRenderer {
  constructor(...args) {
    super(...args);
    installVisualSafetyStyles();
    this.levelPulse = 0;
    this.impactFlash = 0;
    this.groove = new GrooveEngine();
  }

  pulseLevel() {
    // Deliberately no full-screen luminance pulse.
    this.levelPulse = 0;
  }

  pulseImpact(target, options) {
    // Preserve particles, shockwaves and recoil while suppressing white flashes.
    super.pulseImpact(target, options);
    this.impactFlash = 0;
    if (target) target.flash = 0;
  }

  drawSky(theme, _time, level) {
    // Freeze star luminance so stars never twinkle/blink.
    super.drawSky(theme, 0, level);
  }

  drawWeather(time, level, theme) {
    // Render moving weather normally, but replace overload pulsing with a static tint.
    const overload = this.overload;
    this.overload = false;
    super.drawWeather(time, level, theme);
    this.overload = overload;

    if (!overload) return;
    const context = this.context;
    context.save();
    context.fillStyle = 'rgba(255,83,107,0.035)';
    context.fillRect(0, 0, this.width, this.height);
    context.strokeStyle = 'rgba(255,111,104,0.17)';
    context.lineWidth = 2;
    context.strokeRect(5, 5, this.width - 10, this.height - 10);
    context.restore();
  }

  drawTarget(target, _time) {
    // Keep target glows steady instead of oscillating in brightness.
    if (target) target.flash = 0;
    super.drawTarget(target, 0);
  }

  drawPost(theme) {
    // Defensive guard: no level pulse or impact flash may reach the full canvas.
    this.levelPulse = 0;
    this.impactFlash = 0;
    super.drawPost(theme);
  }

  render(frame = {}) {
    this.levelPulse = 0;
    this.impactFlash = 0;
    for (const target of frame.targets || []) {
      target.flash = 0;
      if (!target.__doubleSpeedApplied && Number.isFinite(target.speed)) {
        target.speed *= 2;
        target.__doubleSpeedApplied = true;
      }
    }
    return super.render(frame);
  }
}
