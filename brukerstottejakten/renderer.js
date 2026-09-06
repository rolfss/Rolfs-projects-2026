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

function midi(note) {
  return 440 * (2 ** ((note - 69) / 12));
}

const SOUNDTRACK = [
  {
    title: 'Queue Funk', genre: 'groove', bpm: 112, root: 40,
    bass: [0, null, 0, 3, null, 7, 5, null, 0, null, 10, 7, null, 5, 3, 7],
    chords: [[52, 55, 59], [50, 55, 57], [47, 52, 55], [50, 54, 57]],
    stabs: [2, 5, 7, 10, 13, 15], lead: [12, null, 10, 7, null, 5, 7, null],
  },
  {
    title: 'SLA Overdrive', genre: 'trance', bpm: 148, root: 42,
    bass: [0, 0, null, 0, 7, 0, null, 0, 10, 0, null, 7, 5, 0, 7, 10],
    chords: [[54, 57, 61], [50, 54, 57], [57, 61, 64], [52, 57, 61]],
    arp: [0, 7, 12, 7, 3, 10, 15, 10],
  },
  {
    title: 'Midnight Ticket', genre: 'jazz', bpm: 118, root: 34,
    bass: [0, 4, 7, 9, 10, 9, 7, 4, 5, 9, 12, 10, 7, 5, 4, 2],
    chords: [[46, 50, 53, 57], [51, 55, 58, 62], [43, 46, 50, 53], [48, 52, 55, 58]],
    melody: [14, null, 12, 9, 7, null, 5, 7, 10, null, 9, 7, 5, 4, null, 2],
  },
  {
    title: 'Patch Tuesday Strut', genre: 'groove', bpm: 116, root: 38,
    bass: [0, null, 7, 0, 3, null, 5, 7, 10, null, 7, 5, 3, null, 0, 7],
    chords: [[50, 53, 57], [55, 59, 62], [48, 53, 57], [53, 57, 60]],
    stabs: [1, 4, 6, 9, 11, 14], lead: [7, 10, null, 12, 10, 7, null, 5],
  },
  {
    title: 'Duplicate Reactor', genre: 'trance', bpm: 150, root: 43,
    bass: [0, 0, 7, 0, null, 0, 10, 0, 12, 0, 7, 0, 5, 0, 3, 0],
    chords: [[55, 58, 62], [51, 55, 58], [58, 62, 65], [53, 58, 62]],
    arp: [0, 12, 7, 15, 10, 7, 3, 10],
  },
  {
    title: 'Legacy Lounge', genre: 'jazz', bpm: 122, root: 36,
    bass: [0, 3, 7, 10, 5, 9, 12, 9, 7, 10, 14, 12, 5, 4, 2, 7],
    chords: [[48, 51, 55, 58], [53, 57, 60, 63], [55, 58, 62, 65], [50, 53, 57, 60]],
    melody: [12, 15, null, 14, 10, 7, null, 9, 12, null, 10, 9, 7, null, 5, 3],
  },
  {
    title: 'Escalation Station', genre: 'groove', bpm: 120, root: 41,
    bass: [0, 0, null, 5, 7, null, 10, 7, 0, null, 3, 5, 7, 10, null, 12],
    chords: [[53, 57, 60], [58, 62, 65], [50, 53, 57], [55, 60, 62]],
    stabs: [2, 3, 6, 8, 11, 13, 15], lead: [12, 10, 7, null, 5, 7, 10, 12],
  },
  {
    title: 'Priority Hyperdrive', genre: 'trance', bpm: 152, root: 45,
    bass: [0, 0, null, 0, 3, 0, 7, 0, 10, 0, 12, 0, 7, 0, 5, 0],
    chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 60, 64]],
    arp: [0, 7, 12, 15, 12, 10, 7, 3],
  },
  {
    title: 'Night Shift Blue', genre: 'jazz', bpm: 124, root: 39,
    bass: [0, 4, 7, 11, 5, 8, 10, 12, 7, 10, 14, 12, 5, 3, 2, 7],
    chords: [[51, 55, 58, 62], [56, 60, 63, 67], [58, 62, 65, 68], [53, 56, 60, 63]],
    melody: [14, 12, null, 10, 7, 8, null, 11, 14, null, 12, 10, 8, 7, 5, null],
  },
  {
    title: 'Main Incident Boogie', genre: 'groove', bpm: 124, root: 40,
    bass: [0, 0, 3, 0, 7, 5, 10, 7, 12, 10, 7, 5, 3, 5, 7, 12],
    chords: [[52, 55, 59], [57, 60, 64], [47, 52, 55], [50, 55, 59]],
    stabs: [1, 2, 5, 7, 9, 10, 13, 15], lead: [12, 15, 17, 15, 12, 10, 7, 10], finale: true,
  },
];

class SoundtrackEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.timer = 0;
    this.step = 0;
    this.nextTime = 0;
    this.started = false;
    this.level = 1;
    this.song = SOUNDTRACK[0];
    this.stepDuration = 60 / this.song.bpm / 4;
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

  setLevel(level) {
    const nextLevel = Math.max(1, Math.min(SOUNDTRACK.length, Math.round(Number(level) || 1)));
    if (nextLevel === this.level) return;
    this.level = nextLevel;
    this.song = SOUNDTRACK[nextLevel - 1];
    this.stepDuration = 60 / this.song.bpm / 4;
    this.step = 0;
    if (this.context && this.timer) this.nextTime = this.context.currentTime + 0.055;
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
    const length = Math.floor(context.sampleRate * 0.28);
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
      this.step = (this.step + 1) % 32;
    }
  }

  envelope(gainNode, time, peak, duration, attack = 0.006) {
    gainNode.gain.setValueAtTime(0.0001, time);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  }

  oscillator(frequency, time, duration, {
    type = 'sine', gain = 0.2, endFrequency = null, filterFrequency = null, pan = 0, detune = 0,
  } = {}) {
    const context = this.context;
    if (!context || !this.master) return;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const filter = filterFrequency ? context.createBiquadFilter() : null;
    const panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.detune.setValueAtTime(detune, time);
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

  tranceKick(time, accent = 1) {
    this.oscillator(168, time, 0.18, { type: 'sine', gain: 0.82 * accent, endFrequency: 44 });
    this.oscillator(54, time, 0.14, { type: 'triangle', gain: 0.2 * accent, endFrequency: 35 });
  }

  snare(time, jazz = false) {
    this.noise(time, jazz ? 0.085 : 0.12, { gain: jazz ? 0.19 : 0.32, highpass: jazz ? 1900 : 1200, pan: 0.05 });
    if (!jazz) this.oscillator(185, time, 0.09, { type: 'triangle', gain: 0.16, endFrequency: 125 });
  }

  hat(time, open = false, pan = 0, jazz = false) {
    this.noise(time, open ? (jazz ? 0.16 : 0.11) : 0.035, {
      gain: jazz ? (open ? 0.06 : 0.035) : (open ? 0.085 : 0.055),
      highpass: jazz ? 5200 : 6500,
      pan,
    });
  }

  grooveBass(frequency, time, accent = 1) {
    this.oscillator(frequency, time, 0.105, { type: 'sawtooth', gain: 0.18 * accent, filterFrequency: 520 });
    this.oscillator(frequency / 2, time, 0.13, { type: 'sine', gain: 0.1 * accent });
  }

  tranceBass(frequency, time, accent = 1) {
    this.oscillator(frequency, time, 0.09, { type: 'sawtooth', gain: 0.15 * accent, filterFrequency: 760 });
    this.oscillator(frequency, time, 0.085, { type: 'square', gain: 0.055 * accent, filterFrequency: 620, detune: 7 });
  }

  jazzBass(frequency, time, accent = 1) {
    this.oscillator(frequency, time, 0.19, { type: 'triangle', gain: 0.16 * accent, filterFrequency: 430 });
    this.oscillator(frequency / 2, time, 0.17, { type: 'sine', gain: 0.075 * accent });
  }

  chord(notes, time, { duration = 0.08, gain = 0.034, type = 'square', filterFrequency = 1800, spread = 0.3 } = {}) {
    notes.forEach((note, index) => {
      const center = (notes.length - 1) / 2;
      this.oscillator(midi(note), time + index * 0.002, duration, {
        type: index % 2 ? 'triangle' : type,
        gain,
        filterFrequency,
        pan: (index - center) * spread,
      });
    });
  }

  tranceLead(frequency, time, accent = 1) {
    this.oscillator(frequency, time, 0.11, { type: 'sawtooth', gain: 0.065 * accent, filterFrequency: 2100, pan: -0.16, detune: -8 });
    this.oscillator(frequency, time, 0.11, { type: 'sawtooth', gain: 0.065 * accent, filterFrequency: 2100, pan: 0.16, detune: 8 });
    this.oscillator(frequency * 2, time, 0.08, { type: 'triangle', gain: 0.025 * accent, filterFrequency: 2600 });
  }

  jazzLead(frequency, time, accent = 1) {
    this.oscillator(frequency, time, 0.16, { type: 'triangle', gain: 0.07 * accent, filterFrequency: 1450, pan: 0.08 });
    this.oscillator(frequency / 2, time, 0.12, { type: 'sine', gain: 0.025 * accent, filterFrequency: 1100, pan: -0.08 });
  }

  scheduleGroove(step, time, song) {
    const phraseStep = step % 16;
    const bar = Math.floor(step / 16);
    if ([0, 4, 8, 12].includes(phraseStep)) this.kick(time, phraseStep === 0 ? 1.08 : 0.92);
    if (phraseStep === 10 && (bar || song.finale)) this.kick(time, 0.56);
    if (phraseStep === 4 || phraseStep === 12) this.snare(time);
    if (phraseStep % 2 === 0) this.hat(time, false, phraseStep % 4 === 0 ? -0.18 : 0.18);
    if (phraseStep === 7 || phraseStep === 15) this.hat(time, true, 0.28);

    const interval = song.bass[phraseStep];
    if (interval != null) {
      const variation = bar && phraseStep === 14 ? 12 : interval;
      this.grooveBass(midi(song.root + variation), time + ([3, 11].includes(phraseStep) ? 0.018 : 0), phraseStep === 0 ? 1.12 : 0.9);
    }

    if (song.stabs.includes(phraseStep)) {
      const chordIndex = Math.floor(phraseStep / 4) % song.chords.length;
      this.chord(song.chords[chordIndex], time + 0.012, { duration: 0.075, gain: song.finale ? 0.04 : 0.034 });
    }

    if (bar && phraseStep % 2 === 0) {
      const leadInterval = song.lead[(phraseStep / 2) % song.lead.length];
      if (leadInterval != null) this.oscillator(midi(song.root + 12 + leadInterval), time + 0.018, 0.09, {
        type: 'triangle', gain: song.finale ? 0.045 : 0.03, filterFrequency: 1900, pan: phraseStep % 4 ? 0.22 : -0.22,
      });
    }
  }

  scheduleTrance(step, time, song) {
    const phraseStep = step % 16;
    const bar = Math.floor(step / 16);
    if ([0, 4, 8, 12].includes(phraseStep)) this.tranceKick(time, phraseStep === 0 ? 1.05 : 0.96);
    if (phraseStep === 4 || phraseStep === 12) this.snare(time);
    if (phraseStep % 2 === 0) this.hat(time, false, phraseStep % 4 ? 0.2 : -0.2);
    if ([2, 6, 10, 14].includes(phraseStep)) this.hat(time, true, 0.25);

    const interval = song.bass[phraseStep];
    if (interval != null && phraseStep % 4 !== 0) this.tranceBass(midi(song.root + interval), time + 0.006, 0.95);

    const chordIndex = Math.floor(phraseStep / 4) % song.chords.length;
    if (phraseStep % 4 === 2) this.chord(song.chords[chordIndex], time, { duration: 0.12, gain: 0.024, type: 'sawtooth', filterFrequency: 1500, spread: 0.22 });

    const arpInterval = song.arp[phraseStep % song.arp.length];
    if (phraseStep % 2 === (bar ? 1 : 0)) {
      this.tranceLead(midi(song.root + 12 + arpInterval), time + 0.01, bar ? 1.08 : 0.9);
    }
  }

  scheduleJazz(step, time, song) {
    const phraseStep = step % 16;
    const bar = Math.floor(step / 16);
    const swing = phraseStep % 2 ? this.stepDuration * 0.22 : 0;
    const t = time + swing;

    if (phraseStep === 0 || phraseStep === 8) this.kick(t, 0.46);
    if (phraseStep === 4 || phraseStep === 12) this.snare(t, true);
    if ([0, 3, 6, 8, 11, 14].includes(phraseStep)) this.hat(t, phraseStep === 6 || phraseStep === 14, phraseStep % 2 ? 0.16 : -0.16, true);

    const interval = song.bass[phraseStep];
    if (interval != null && phraseStep % 2 === 0) this.jazzBass(midi(song.root + interval), t, phraseStep === 0 ? 1.06 : 0.9);

    if ([0, 6, 10, 14].includes(phraseStep)) {
      const chordIndex = Math.floor((phraseStep + bar * 2) / 4) % song.chords.length;
      this.chord(song.chords[chordIndex], t + 0.018, { duration: 0.21, gain: 0.026, type: 'triangle', filterFrequency: 1300, spread: 0.24 });
    }

    const melodyInterval = song.melody[phraseStep];
    if (melodyInterval != null && (bar || phraseStep % 4 !== 0)) {
      this.jazzLead(midi(song.root + 12 + melodyInterval), t + 0.02, bar ? 1.05 : 0.88);
    }
  }

  scheduleStep(step, time) {
    const song = this.song;
    if (song.genre === 'trance') this.scheduleTrance(step, time, song);
    else if (song.genre === 'jazz') this.scheduleJazz(step, time, song);
    else this.scheduleGroove(step, time, song);
  }
}

export class SceneRenderer extends BaseSceneRenderer {
  constructor(...args) {
    super(...args);
    installVisualSafetyStyles();
    this.levelPulse = 0;
    this.impactFlash = 0;
    this.soundtrack = new SoundtrackEngine();
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
    this.soundtrack.setLevel(frame.level || 1);
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
