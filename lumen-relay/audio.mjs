const STORAGE_KEY = 'lumen-relay:sound';

function storedPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export class SoundEngine {
  constructor() {
    this.enabled = storedPreference();
    this.context = null;
    this.master = null;
  }

  async unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, this.enabled ? 'on' : 'off');
    } catch {
      // The game remains playable when browser storage is unavailable.
    }
    if (!this.enabled && this.context?.state === 'running') this.context.suspend();
    if (this.enabled) this.unlock();
    return this.enabled;
  }

  tone({ frequency = 440, endFrequency = frequency, duration = 0.12, volume = 0.5, type = 'sine', delay = 0 } = {}) {
    if (!this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  pickup() {
    this.tone({ frequency: 420, endFrequency: 760, duration: 0.11, volume: 0.5, type: 'triangle' });
  }

  deliver(combo = 1) {
    const root = 460 + Math.min(combo, 8) * 22;
    this.tone({ frequency: root, endFrequency: root * 1.08, duration: 0.16, volume: 0.52 });
    this.tone({ frequency: root * 1.5, endFrequency: root * 1.55, duration: 0.2, volume: 0.32, type: 'triangle', delay: 0.035 });
  }

  dash() {
    this.tone({ frequency: 180, endFrequency: 520, duration: 0.13, volume: 0.3, type: 'sawtooth' });
  }

  hit() {
    this.tone({ frequency: 170, endFrequency: 65, duration: 0.3, volume: 0.52, type: 'square' });
  }

  wave() {
    [0, 0.08, 0.16].forEach((delay, index) => {
      this.tone({ frequency: 330 * (1 + index * 0.25), endFrequency: 430 * (1 + index * 0.2), duration: 0.18, volume: 0.26, type: 'triangle', delay });
    });
  }

  countdown() {
    this.tone({ frequency: 720, endFrequency: 680, duration: 0.07, volume: 0.22 });
  }

  gameOver() {
    [0, 0.12, 0.24].forEach((delay, index) => {
      this.tone({ frequency: 310 - index * 55, endFrequency: 250 - index * 55, duration: 0.22, volume: 0.3, type: 'triangle', delay });
    });
  }
}
