/* Original music and sound for Vedtak. Dependency-free, synthesized in the browser. */
(function (global) {
  'use strict';

  const midiHz = n => 440 * Math.pow(2, (n - 69) / 12);
  const THEMES = [
    {
      name: 'Fjord', bpm: 112, steps: 16, lead: 'flute', arp: 'pluck',
      chords: [[50, 62, 66, 69, 73], [47, 62, 66, 69, 74], [43, 62, 67, 69, 74], [45, 61, 64, 69, 71]],
      melody: [
        [[0, 74, 2], [3, 78, 2], [6, 81, 3], [10, 78, 2], [13, 76, 2]],
        [[0, 74, 3], [4, 71, 2], [7, 74, 2], [10, 78, 4]],
        [[0, 79, 2], [3, 81, 2], [6, 83, 3], [10, 81, 2], [13, 78, 2]],
        [[0, 76, 3], [4, 74, 2], [7, 73, 2], [10, 71, 2], [13, 69, 2]],
        [[0, 74, 2], [3, 78, 2], [6, 81, 2], [9, 86, 3], [13, 83, 2]],
        [[0, 81, 3], [4, 78, 2], [7, 74, 3], [11, 71, 3]],
        [[0, 74, 2], [3, 79, 2], [6, 81, 3], [10, 83, 2], [13, 81, 2]],
        [[0, 76, 3], [4, 73, 2], [7, 71, 2], [10, 69, 4]]
      ]
    },
    {
      name: 'Archive', bpm: 116, steps: 12, lead: 'marimba', arp: 'bell',
      chords: [[48, 60, 64, 67, 71], [45, 60, 64, 69, 72], [50, 62, 65, 69, 72], [43, 59, 62, 67, 69]],
      melody: [
        [[0, 76, 2], [2, 79, 2], [4, 83, 3], [8, 79, 2], [10, 76, 2]],
        [[0, 81, 3], [4, 76, 2], [6, 72, 2], [8, 76, 3]],
        [[0, 77, 2], [2, 81, 2], [4, 84, 3], [8, 81, 2], [10, 77, 2]],
        [[0, 79, 3], [4, 74, 2], [6, 71, 2], [8, 74, 3]],
        [[0, 79, 2], [2, 83, 2], [4, 84, 3], [8, 83, 2], [10, 79, 2]],
        [[0, 81, 2], [2, 79, 2], [4, 76, 3], [8, 72, 3]],
        [[0, 74, 2], [2, 77, 2], [4, 81, 3], [8, 77, 2], [10, 74, 2]],
        [[0, 71, 2], [2, 74, 2], [4, 79, 3], [8, 74, 2], [10, 71, 2]]
      ]
    },
    {
      name: 'Aurora', bpm: 132, steps: 16, lead: 'synth', arp: 'pluck',
      chords: [[40, 59, 62, 64, 67], [48, 60, 64, 67, 71], [43, 59, 62, 67, 69], [45, 61, 64, 69, 71]],
      melody: [
        [[0, 76, 2], [3, 79, 1], [5, 83, 2], [8, 86, 3], [12, 83, 2], [14, 79, 1]],
        [[0, 84, 3], [4, 83, 2], [7, 79, 2], [10, 76, 3], [14, 79, 1]],
        [[0, 83, 2], [3, 86, 2], [6, 91, 3], [10, 86, 2], [13, 83, 2]],
        [[0, 81, 3], [4, 85, 2], [7, 88, 2], [10, 85, 2], [13, 81, 2]],
        [[0, 88, 3], [4, 86, 2], [7, 83, 2], [10, 79, 2], [13, 76, 2]],
        [[0, 79, 2], [3, 84, 2], [6, 88, 3], [10, 86, 2], [13, 84, 2]],
        [[0, 83, 2], [3, 86, 2], [6, 83, 2], [9, 79, 3], [13, 74, 2]],
        [[0, 76, 2], [3, 81, 2], [6, 85, 3], [10, 83, 2], [13, 81, 2]]
      ]
    }
  ];

  class VedtakAudio {
    constructor({ music = true, effects = true, onChange = null } = {}) {
      this.music = Boolean(music);
      this.effects = Boolean(effects);
      this.onChange = typeof onChange === 'function' ? onChange : null;
      this._ctx = null;
      this._ready = false;
      this._destroyed = false;
      this._paused = false;
      this._chapter = 0;
      this._bar = 0;
      this._step = 0;
      this._nextTime = 0;
      this._timer = null;
      this._pending = null;
      this._voices = new Set();
      this._lastCue = Object.create(null);
      this._graph = [];
      this._graphReady = false;
    }

    snapshot() {
      return { music: this.music, effects: this.effects, ready: this._ready };
    }

    _notify() {
      try { if (this.onChange) this.onChange(this.snapshot()); } catch (_) { /* UI callbacks cannot break audio. */ }
    }

    async ensure() {
      if (this._destroyed) return this.snapshot();
      if (this._pending) return this._pending;
      this._pending = this._ensureInternal();
      try { return await this._pending; } finally { this._pending = null; }
    }

    async _ensureInternal() {
      try {
        if (!this._ctx) {
          const AudioContext = global.AudioContext || global.webkitAudioContext;
          if (!AudioContext) { this._ready = false; this._notify(); return this.snapshot(); }
          this._ctx = new AudioContext({ latencyHint: 'interactive' });
          this._buildGraph();
          this._ctx.onstatechange = () => {
            if (this._destroyed) return;
            this._ready = this._ctx && this._ctx.state === 'running';
            try { this._syncPlayback(); } catch (_) { this._stopScheduler(); this._ready = false; }
            this._notify();
          };
        }
        if (this._ctx.state !== 'running') await this._ctx.resume();
        if (this._destroyed) return this.snapshot();
        this._ready = this._ctx.state === 'running';
        this._syncPlayback();
      } catch (_) {
        this._ready = false;
        this._stopScheduler();
        // Keep a valid suspended context so another gesture can retry a blocked resume.
        if (!this._graphReady) this._releaseContext();
      }
      this._notify();
      return this.snapshot();
    }

    _buildGraph() {
      const c = this._ctx;
      const musicBus = this._musicBus = c.createGain();
      const fxBus = this._fxBus = c.createGain();
      const musicTone = c.createBiquadFilter();
      musicTone.type = 'lowpass'; musicTone.frequency.value = 6000; musicTone.Q.value = 0.45;
      const compressor = c.createDynamicsCompressor();
      compressor.threshold.value = -17; compressor.knee.value = 14;
      compressor.ratio.value = 3; compressor.attack.value = 0.006; compressor.release.value = 0.18;
      const master = c.createGain(); master.gain.value = 0.75;
      musicBus.gain.value = 0; fxBus.gain.value = this.effects ? 0.8 : 0;
      musicBus.connect(musicTone); musicTone.connect(compressor); fxBus.connect(compressor);
      compressor.connect(master); master.connect(c.destination);

      // A quiet, filtered stereo echo gives the small synths depth without washing out the melody.
      const delay = this._delay = c.createDelay(1);
      delay.delayTime.value = 0.268;
      const echoFilter = c.createBiquadFilter(); echoFilter.type = 'lowpass'; echoFilter.frequency.value = 2600;
      const feedback = c.createGain(); feedback.gain.value = 0.20;
      const wet = this._wet = c.createGain(); wet.gain.value = 0.10;
      musicTone.connect(delay); delay.connect(echoFilter); echoFilter.connect(feedback);
      feedback.connect(delay); echoFilter.connect(wet); wet.connect(compressor);
      this._graph.push(musicBus, fxBus, musicTone, compressor, master, delay, echoFilter, feedback, wet);

      // Band-limited warm waveform: no bright sawtooth or square-wave edge.
      this._warmWave = c.createPeriodicWave(new Float32Array(7), new Float32Array([0, 1, 0.26, 0.15, 0.07, 0.035, 0.018]));
      const size = Math.max(1, Math.floor(c.sampleRate * 0.32));
      this._noise = c.createBuffer(1, size, c.sampleRate);
      const data = this._noise.getChannelData(0);
      let seed = 13579;
      for (let i = 0; i < size; i++) { seed = (1664525 * seed + 1013904223) >>> 0; data[i] = (seed / 4294967296) * 2 - 1; }
      this._graphReady = true;
    }

    setChapter(index) {
      const n = Number(index);
      const chapter = Number.isFinite(n) ? Math.max(0, Math.min(2, Math.floor(n))) : 0;
      if (chapter === this._chapter || this._destroyed) return this.snapshot();
      this._chapter = chapter; this._bar = 0; this._step = 0; this._nextTime = 0;
      try {
        this._stopVoices('music');
        if (this._ctx && this._delay) this._delay.delayTime.setTargetAtTime(60 / THEMES[chapter].bpm / 2, this._ctx.currentTime, 0.12);
        this._syncPlayback();
      } catch (_) { this._ready = false; this._stopScheduler(); }
      this._notify();
      return this.snapshot();
    }

    setPaused(paused) {
      this._paused = Boolean(paused);
      try { this._syncPlayback(); if (this._paused) this._stopVoices('fx'); }
      catch (_) { this._ready = false; this._stopScheduler(); }
      this._notify();
      return this.snapshot();
    }

    async toggleMusic() {
      if (this._destroyed) return this.snapshot();
      this.music = !this.music;
      if (this.music) return this.ensure();
      try { this._syncPlayback(); } catch (_) { this._ready = false; this._stopScheduler(); }
      this._notify();
      return this.snapshot();
    }

    async toggleEffects() {
      if (this._destroyed) return this.snapshot();
      this.effects = !this.effects;
      if (this.effects) return this.ensure();
      try { this._syncPlayback(); this._stopVoices('fx'); } catch (_) { this._ready = false; this._stopScheduler(); }
      this._notify();
      return this.snapshot();
    }

    _fade(param, value, time, seconds = 0.045) {
      param.cancelScheduledValues(time);
      param.setTargetAtTime(value, time, seconds);
    }

    _syncPlayback() {
      if (!this._ctx || this._destroyed || !this._musicBus) return;
      const time = this._ctx.currentTime;
      const playing = this._ready && this.music && !this._paused;
      this._fade(this._musicBus.gain, playing ? 1.10 : 0, time);
      this._fade(this._wet.gain, playing ? 0.10 : 0, time);
      this._fade(this._fxBus.gain, this._ready && this.effects && !this._paused ? 0.8 : 0, time, 0.018);
      if (!playing) {
        this._stopScheduler(); this._stopVoices('music'); this._nextTime = 0;
      } else {
        if (!this._nextTime) this._nextTime = time + 0.045;
        if (this._timer === null) this._timer = global.setInterval(() => this._tick(), 40);
        this._tick();
      }
    }

    _stopScheduler() {
      if (this._timer !== null) global.clearInterval(this._timer);
      this._timer = null;
    }

    _tick() {
      if (!this._ready || !this.music || this._paused || this._destroyed || !this._ctx) return;
      try {
        const now = this._ctx.currentTime;
        if (this._nextTime < now - 0.2) this._nextTime = now + 0.035;
        while (this._nextTime < now + 0.20) {
          const theme = THEMES[this._chapter];
          const stepTime = 60 / theme.bpm / 4;
          this._scheduleStep(theme, this._step, this._bar, this._nextTime, stepTime);
          this._nextTime += stepTime;
          this._step++;
          if (this._step >= theme.steps) { this._step = 0; this._bar = (this._bar + 1) % 8; }
        }
      } catch (_) { this._ready = false; this._stopScheduler(); this._notify(); }
    }

    _scheduleStep(theme, step, bar, time, unit) {
      const chord = theme.chords[bar % theme.chords.length];
      const archive = this._chapter === 1;
      const finale = this._chapter === 2;
      const melody = theme.melody[bar].find(note => note[0] === step);
      if (melody) {
        this._note(melody[1], time, unit * melody[2] * 0.96, finale ? 0.150 : 0.155, theme.lead, 'music', -0.08);
        if (finale && bar >= 4 && step === 0) this._note(melody[1] - 12, time, unit * melody[2], 0.026, 'sine', 'music', 0.15);
      }

      if (step === 0) {
        for (let i = 1; i < 4; i++) this._note(chord[i], time, unit * theme.steps * 0.98, 0.021, 'pad', 'music', (i - 2) * 0.45);
        this._note(chord[0], time, unit * (archive ? 3.2 : 3.1), 0.145, 'bass', 'music', 0);
      }
      if (archive) {
        // Bass on one; softly brushed chords on two and three: a cozy, buoyant 3/4.
        if (step === 4 || step === 8) {
          for (let i = 1; i <= 3; i++) this._note(chord[i], time, unit * 2.3, 0.036, 'marimba', 'music', i === 1 ? -0.22 : 0.22);
          this._percussion('brush', time, 0.018);
        }
        if (step % 2 === 0) this._note(chord[1 + ((step / 2 + bar) % 4)] + 12, time, unit * 1.5, 0.020, 'bell', 'music', step % 4 ? -0.40 : 0.40);
        if (step === 0) this._percussion('kick', time, 0.12);
        if (step === 6) this._note(chord[0] + 7, time, unit * 1.6, 0.069, 'bass', 'music', 0);
      } else {
        if (step === 8 || (finale && step === 6)) this._note(chord[0] + (step === 6 ? 12 : 7), time, unit * 2.8, 0.105, 'bass', 'music', 0);
        if (finale && step === 14) this._note(chord[0] + 12, time, unit * 1.6, 0.075, 'bass', 'music', 0);
        const arpStep = finale || step % 2 === 0;
        if (arpStep) {
          const pattern = [1, 3, 2, 4, 2, 3, 4, 3];
          const p = pattern[Math.floor(step / (finale ? 1 : 2)) % pattern.length];
          this._note(chord[p] + 12, time, unit * (finale ? 0.95 : 1.55), finale ? 0.026 : 0.031, theme.arp, 'music', step % 4 < 2 ? -0.48 : 0.48);
        }
        if (step === 0 || step === 8 || (finale && step === 10)) this._percussion('kick', time, finale ? 0.23 : 0.18);
        if (step === 4 || step === 12) this._percussion('snare', time, finale ? 0.043 : 0.029);
        if (step % 2 === 0) this._percussion('hat', time, step % 4 === 2 ? 0.019 : 0.010);
        if (finale && bar % 4 === 3 && step >= 14) this._percussion('snare', time, 0.030);
      }
    }

    _note(midi, time, length, volume, instrument = 'sine', tag = 'fx', pan = 0, endMidi = null) {
      const c = this._ctx;
      if (!c || this._destroyed || this._voices.size > 150) return;
      const duration = Math.max(0.045, length);
      const gain = c.createGain();
      const osc = c.createOscillator();
      const nodes = [gain, osc];
      const destination = tag === 'music' ? this._musicBus : this._fxBus;
      let output = gain;
      if (typeof c.createStereoPanner === 'function') {
        const panner = c.createStereoPanner(); panner.pan.value = pan; gain.connect(panner); output = panner; nodes.push(panner);
      }
      output.connect(destination);
      osc.type = ['bass', 'marimba', 'pluck'].includes(instrument) ? 'triangle' : 'sine';
      if (instrument === 'synth' || instrument === 'flute') osc.setPeriodicWave(this._warmWave);
      osc.frequency.setValueAtTime(midiHz(midi), time);
      if (endMidi !== null) osc.frequency.exponentialRampToValueAtTime(midiHz(endMidi), time + duration * 0.85);
      const attack = instrument === 'pad' ? Math.min(0.20, duration * 0.23) : instrument === 'flute' ? 0.026 : 0.006;
      const tail = instrument === 'pad' ? 0.18 : instrument === 'bell' ? 0.24 : 0.055;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + attack);
      const ringing = ['marimba', 'pluck', 'bell'].includes(instrument);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * (ringing ? 0.13 : 0.66)), time + duration);
      gain.gain.linearRampToValueAtTime(0, time + duration + tail);
      osc.connect(gain);
      const sources = [osc];
      if (instrument === 'pad' || instrument === 'bell' || instrument === 'marimba') {
        const harmonic = c.createOscillator(); const harmonicGain = c.createGain();
        harmonic.type = 'sine'; harmonic.frequency.value = midiHz(midi) * (instrument === 'pad' ? 1 : 2);
        harmonic.detune.value = instrument === 'pad' ? 5 : 0;
        harmonicGain.gain.value = instrument === 'pad' ? 0.42 : 0.18;
        harmonic.connect(harmonicGain); harmonicGain.connect(gain); sources.push(harmonic); nodes.push(harmonic, harmonicGain);
      }
      const voice = { tag, gain, sources, nodes };
      this._voices.add(voice);
      osc.onended = () => this._cleanupVoice(voice);
      for (const source of sources) { source.start(time); source.stop(time + duration + tail + 0.025); }
    }

    _percussion(kind, time, volume, tag = 'music') {
      if (kind === 'kick') { this._note(43, time, 0.115, volume, 'sine', tag, 0, 25); return; }
      const c = this._ctx;
      if (!c || this._destroyed || this._voices.size > 150) return;
      const duration = kind === 'hat' ? 0.048 : kind === 'brush' ? 0.11 : 0.095;
      const source = c.createBufferSource(); source.buffer = this._noise;
      const filter = c.createBiquadFilter(); filter.type = kind === 'hat' ? 'highpass' : 'bandpass';
      filter.frequency.value = kind === 'hat' ? 6600 : kind === 'brush' ? 2300 : 1600;
      filter.Q.value = 0.55;
      const gain = c.createGain(); gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      gain.gain.linearRampToValueAtTime(0, time + duration + 0.015);
      source.connect(filter); filter.connect(gain); gain.connect(tag === 'music' ? this._musicBus : this._fxBus);
      const voice = { tag, gain, sources: [source], nodes: [source, filter, gain] };
      this._voices.add(voice); source.onended = () => this._cleanupVoice(voice);
      source.start(time); source.stop(time + duration + 0.025);
      if (kind === 'snare') this._note(50, time, 0.075, volume * 0.60, 'sine', tag);
    }

    _cleanupVoice(voice) {
      if (!this._voices.delete(voice)) return;
      for (const node of voice.nodes) { try { node.disconnect(); } catch (_) { /* Already disconnected. */ } }
    }

    _stopVoices(tag) {
      if (!this._ctx) return;
      const now = this._ctx.currentTime;
      for (const voice of this._voices) {
        if (tag && voice.tag !== tag) continue;
        try {
          voice.gain.gain.cancelScheduledValues(now);
          voice.gain.gain.setTargetAtTime(0, now, 0.012);
          for (const source of voice.sources) source.stop(now + 0.06);
        } catch (_) { this._cleanupVoice(voice); }
      }
    }

    cue(name) {
      if (!this.effects || !this._ready || this._paused || this._destroyed || !this._ctx) return false;
      const known = ['coin', 'jump', 'dash', 'hurt', 'stomp', 'letter', 'win', 'burst', 'rank'];
      if (!known.includes(name)) return false;
      try {
        const now = this._ctx.currentTime;
        const gap = name === 'coin' ? 0.025 : name === 'hurt' ? 0.20 : 0.06;
        if (this._lastCue[name] !== undefined && now - this._lastCue[name] < gap) return false;
        this._lastCue[name] = now;
        const t = now + 0.006;
        const n = (midi, offset, length, gain, type = 'bell', endMidi = null) => this._note(midi, t + offset, length, gain, type, 'fx', 0, endMidi);
        switch (name) {
          case 'coin': n(88, 0, 0.075, 0.13); n(95, 0.066, 0.15, 0.115); break;
          case 'jump': n(60, 0, 0.13, 0.12, 'sine', 79); break;
          case 'dash': n(69, 0, 0.10, 0.10, 'sine', 88); this._percussion('brush', t, 0.045, 'fx'); break;
          case 'hurt': n(53, 0, 0.19, 0.12, 'synth', 41); n(56, 0.012, 0.15, 0.045, 'sine', 44); break;
          case 'stomp': n(48, 0, 0.095, 0.15, 'sine', 33); n(76, 0.05, 0.09, 0.085, 'marimba'); break;
          case 'letter': [74, 78, 81, 86].forEach((m, i) => n(m, i * 0.067, 0.23, 0.12)); break;
          case 'burst': [69, 74, 78, 81, 86].forEach((m, i) => n(m, i * 0.047, 0.24, 0.09)); this._percussion('brush', t, 0.045, 'fx'); break;
          case 'win':
            [[74, 0, 0.14], [78, 0.16, 0.14], [81, 0.32, 0.14], [86, 0.52, 0.50], [85, 1.06, 0.18], [86, 1.30, 0.72]].forEach(([m, offset, len]) => n(m, offset, len, 0.14, 'flute'));
            [50, 62, 66, 69].forEach(m => n(m, 0.52, 0.46, 0.05, 'pad'));
            [50, 62, 66, 69, 74].forEach(m => n(m, 1.30, 0.85, 0.055, 'pad'));
            [86, 90, 93, 98].forEach((m, i) => n(m, 1.31 + i * 0.08, 0.32, 0.07));
            break;
          case 'rank':
            [74, 78, 81, 86, 90, 93].forEach((m, i) => n(m, i * 0.072, 0.22, 0.11));
            [62, 66, 69, 74].forEach(m => n(m, 0.47, 0.70, 0.062, 'pad'));
            n(98, 0.52, 0.60, 0.095); break;
        }
        return true;
      } catch (_) { this._notify(); return false; }
    }

    _releaseContext() {
      const c = this._ctx;
      if (!c) return;
      c.onstatechange = null;
      for (const voice of Array.from(this._voices)) {
        for (const source of voice.sources) { try { source.stop(); } catch (_) { /* Already stopped. */ } }
        this._cleanupVoice(voice);
      }
      for (const node of this._graph) { try { node.disconnect(); } catch (_) { /* Partially constructed graph. */ } }
      this._graph = []; this._graphReady = false; this._ctx = null; this._musicBus = null; this._fxBus = null;
      try { const closing = c.close(); if (closing && typeof closing.catch === 'function') closing.catch(() => {}); } catch (_) { /* Device already closed. */ }
    }

    destroy() {
      if (this._destroyed) return;
      this._destroyed = true; this._ready = false;
      this._stopScheduler(); this._releaseContext(); this._notify();
    }
  }

  global.VedtakAudio = VedtakAudio;
})(typeof window !== 'undefined' ? window : globalThis);
