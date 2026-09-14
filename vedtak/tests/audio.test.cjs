'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../audio.js'), 'utf8');

function harness(options = {}) {
  const timers = new Map();
  let nextTimer = 1;
  const contexts = [];
  const records = [];
  class Param {
    constructor(value = 0) { this.value = value; }
    setValueAtTime(value, time) { this.check(value, time); this.value = value; }
    linearRampToValueAtTime(value, time) { this.check(value, time); this.value = value; }
    exponentialRampToValueAtTime(value, time) { assert.ok(value > 0, 'Exponential target must be positive'); this.check(value, time); this.value = value; }
    setTargetAtTime(value, time, tau) { assert.ok(tau > 0); this.check(value, time); this.value = value; }
    cancelScheduledValues(time) { assert.ok(Number.isFinite(time) && time >= 0); }
    check(value, time) { assert.ok(Number.isFinite(value), 'Finite AudioParam value'); assert.ok(Number.isFinite(time) && time >= 0, 'Valid audio time'); }
  }
  class Node {
    constructor(c, type) { this.context = c; this.kind = type; this.connected = []; this.disconnected = false; }
    connect(destination) { assert.ok(destination, 'Nodes connect to a valid destination'); this.connected.push(destination); return destination; }
    disconnect() { this.disconnected = true; this.connected = []; }
  }
  class Voice extends Node {
    constructor(c, type) { super(c, type); this.frequency = new Param(); this.detune = new Param(); this.startTime = null; this.stopTime = null; }
    setPeriodicWave(wave) { assert.ok(wave); }
    start(time = 0) { assert.equal(this.startTime, null, 'Source starts only once'); assert.ok(time >= 0); this.startTime = time; this.context.sources.add(this); records.push({ type: this.kind, time, frequency: this.frequency.value }); }
    stop(time = 0) { assert.ok(time >= 0); this.stopTime = time; }
  }
  class Context {
    constructor() { if (options.constructorError) throw new Error('Device unavailable'); this.currentTime = 0; this.sampleRate = 48000; this.state = 'suspended'; this.sources = new Set(); this.destination = new Node(this, 'destination'); contexts.push(this); }
    createGain() { const n = new Node(this, 'gain'); n.gain = new Param(1); return n; }
    createBiquadFilter() { const n = new Node(this, 'filter'); n.frequency = new Param(); n.Q = new Param(); return n; }
    createDynamicsCompressor() { const n = new Node(this, 'compressor'); for (const key of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[key] = new Param(); return n; }
    createDelay() { const n = new Node(this, 'delay'); n.delayTime = new Param(); return n; }
    createStereoPanner() { const n = new Node(this, 'panner'); n.pan = new Param(); return n; }
    createPeriodicWave(real, imaginary) { if (options.graphError) throw new Error('Graph failed'); return { real, imaginary }; }
    createBuffer(channels, size) { assert.ok(channels > 0 && size > 0); return { getChannelData: () => new Float32Array(size) }; }
    createOscillator() { return new Voice(this, 'oscillator'); }
    createBufferSource() { return new Voice(this, 'noise'); }
    async resume() { if (options.resumeError) throw new Error('Autoplay blocked'); this.state = 'running'; if (this.onstatechange) this.onstatechange(); }
    async close() { this.state = 'closed'; if (this.onstatechange) this.onstatechange(); }
    advance(seconds) {
      this.currentTime += seconds;
      for (const node of [...this.sources]) if (node.stopTime !== null && node.stopTime <= this.currentTime) { this.sources.delete(node); if (node.onended) node.onended(); }
      for (const cb of [...timers.values()]) cb();
    }
  }
  const window = {
    AudioContext: options.unavailable ? undefined : Context,
    setInterval(cb) { const id = nextTimer++; timers.set(id, cb); return id; },
    clearInterval(id) { timers.delete(id); }
  };
  vm.runInNewContext(source, { window, Float32Array, Set, Number, Math, Boolean, Object, Array });
  return { Audio: window.VedtakAudio, timers, contexts, records, options };
}

(async () => {
  const h = harness();
  const changes = [];
  const audio = new h.Audio({ onChange: state => changes.push(state) });
  assert.equal(audio.snapshot().music, true);
  assert.equal(audio.snapshot().effects, true);
  assert.equal(audio.snapshot().ready, false);
  assert.equal(h.contexts.length, 0, 'Construction does not try autoplay');
  assert.equal(audio.cue('coin'), false, 'Effects before gesture are harmless');
  const [one, two] = await Promise.all([audio.ensure(), audio.ensure()]);
  assert.ok(one.ready && two.ready);
  assert.equal(h.contexts.length, 1, 'Concurrent gestures share one context');
  assert.equal(h.timers.size, 1, 'Only one scheduler');
  const c = h.contexts[0];
  const themeCounts = [];
  for (let chapter = 0; chapter < 3; chapter++) {
    audio.setChapter(chapter);
    const before = h.records.length;
    for (let i = 0; i < 550; i++) c.advance(0.04);
    themeCounts.push(h.records.length - before);
    assert.ok(h.records.length - before > 200, 'Each theme plays complete multi-instrument music');
    assert.ok(audio._voices.size < 100, 'Voices are cleaned as they end');
    assert.equal(audio.snapshot().ready, true, 'No scheduler exception');
  }
  assert.equal(new Set(themeCounts).size, 3, 'Three arrangements have distinct activity');
  const beforePause = h.records.length;
  audio.setPaused(true);
  assert.equal(h.timers.size, 0);
  c.advance(3);
  assert.equal(h.records.length, beforePause, 'Pause schedules no notes');
  assert.equal(audio.cue('coin'), false, 'Pause silences effects');
  audio.setPaused(false);
  assert.equal(h.timers.size, 1);
  assert.ok(h.records.length > beforePause);
  await audio.toggleMusic();
  assert.equal(h.timers.size, 0);
  assert.equal(audio.snapshot().music, false);
  assert.equal(audio.snapshot().effects, true);
  for (const cue of ['coin', 'jump', 'dash', 'hurt', 'stomp', 'letter', 'win', 'burst', 'rank']) {
    c.advance(2.5);
    const before = h.records.length;
    assert.equal(audio.cue(cue), true, cue + ' plays with music off');
    assert.ok(h.records.length > before, cue + ' creates sound');
  }
  assert.equal(audio.cue('rank'), false, 'Rapid repeated cues are bounded');
  assert.equal(audio.cue('unknown'), false);
  await audio.toggleEffects();
  assert.equal(audio.cue('coin'), false);
  await audio.toggleMusic();
  assert.equal(audio.snapshot().music, true);
  assert.equal(audio.snapshot().effects, false);
  assert.equal(h.timers.size, 1, 'Music works with effects disabled');
  c.state = 'suspended'; c.onstatechange();
  assert.equal(audio.snapshot().ready, false);
  assert.equal(h.timers.size, 0, 'Suspended context stops scheduler');
  await audio.ensure();
  assert.equal(audio.snapshot().ready, true);
  assert.equal(h.timers.size, 1);
  c.advance(60);
  assert.ok(audio._nextTime < c.currentTime + 0.5, 'Long stalls do not create note backlogs');
  audio.setChapter(NaN); audio.setChapter(99); audio.setChapter(-5);
  assert.equal(audio._chapter, 0, 'Chapter indices are bounded');
  audio.destroy(); audio.destroy();
  assert.equal(c.state, 'closed');
  assert.equal(h.timers.size, 0);
  assert.equal(audio._voices.size, 0);
  assert.equal((await audio.ensure()).ready, false);
  assert.equal(audio.cue('win'), false);
  assert.ok(changes.length > 0);

  for (const failure of ['unavailable', 'constructorError', 'resumeError', 'graphError']) {
    const opts = { [failure]: true };
    const bad = harness(opts); let notifications = 0;
    const player = new bad.Audio({ onChange() { notifications++; throw new Error('UI callback failed'); } });
    const state = await player.ensure();
    assert.equal(state.ready, false, failure + ' fails safely');
    assert.ok(notifications > 0, failure + ' notifies UI');
    assert.equal(bad.timers.size, 0);
    if (failure === 'resumeError') {
      bad.options.resumeError = false;
      assert.equal((await player.ensure()).ready, true, 'A later gesture retries blocked resume');
    }
    player.destroy();
  }
  console.log('PASS: 3 full themes, 9 cues, ahead scheduling, bounded voices, independent gates, pause/resume, stalls, cleanup, and 4 unavailable/error cases.');
  console.log('Scheduled source counts by theme over 22 seconds:', themeCounts.join(', '));
})().catch(error => { console.error(error); process.exitCode = 1; });
