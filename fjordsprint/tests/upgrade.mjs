// Bounded, read-only regression checks for the local FJORDSPRINT upgrade.
// Run: node work/upgrade-qa.mjs [path/to/dist]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] || fileURLToPath(new URL('../dist/',import.meta.url)));
const required = ['tracks.js', 'physics.js', 'smoothing.js', 'encounters.js', 'progression.js'];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.log(`WAIT: implementation modules are not yet present: ${missing.join(', ')}`);
  process.exit(2);
}
const [tracks, physics, smoothing, encountersModule, progression] = await Promise.all(
  required.map(file => import(pathToFileURL(path.join(root, file))))
);
const { Track, courses } = tracks;
const { initialState, stepCar, recoverCar } = physics;
const { interpolateState } = smoothing;
const { createEncounters, stepEncounters } = encountersModule;
const { loadProgress, unlocked, rank, completeStage } = progression;
const h = 1 / 120;
const report = [];
const near = (actual, expected, tolerance = 1e-8, message = '') =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${message}: got ${actual}, expected ${expected} ± ${tolerance}`);
function check(name, test) {
  try { const evidence = test(); report.push({ name, pass: true, evidence }); }
  catch (error) { report.push({ name, pass: false, error: error.stack }); }
}
const flat = new Track({ ...courses[0], points: [[0, 10, 0], [0, 10, -1000], [0, 10, -5000]], quiz: [], pads: [], jumps: [] });

check('Interpolation is read-only and has exact pose endpoints', () => {
  const previous = { ...initialState(), s: 100, x: -2, speed: 45, heading: -.2, steer: -.3, air: .4, time: 1 };
  const current = { ...previous, s: 101, x: 2, speed: 46, heading: .2, steer: .3, air: .6, time: 1 + h };
  const copies = JSON.stringify([previous, current]);
  for (const alpha of [0, .25, .5, .75, 1]) {
    const rendered = interpolateState(previous, current, alpha, flat);
    assert.notEqual(rendered, previous); assert.notEqual(rendered, current);
    for (const key of ['s', 'x', 'speed', 'heading', 'steer'])
      near(rendered[key], previous[key] + (current[key] - previous[key]) * alpha, 1e-8, key);
    near(rendered.rideHeight, previous.air + (current.air - previous.air) * alpha, 1e-8, 'rideHeight');
  }
  assert.equal(JSON.stringify([previous, current]), copies, 'Presentation must not mutate authoritative physics');
});

for (const hz of [30, 60, 90, 120, 144, 165, 240]) for (const jitter of [0, .002]) {
  check(`Smooth constant velocity at ${hz} Hz${jitter ? ' with ±2 ms pacing variation' : ''}`, () => {
    let accumulator = 0, seed = 12345, previous = { ...initialState(), s: 100, speed: 80 }, current = { ...previous }, lastRendered;
    let maximumIncrementError = 0;
    for (let frame = 0; frame < hz * 2; frame++) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      const dt = 1 / hz + (seed / 2 ** 32 * 2 - 1) * jitter;
      accumulator += dt;
      while (accumulator + 1e-12 >= h) { previous = { ...current }; current.s += 80 * h; current.time += h; accumulator -= h; }
      const rendered = interpolateState(previous, current, Math.max(0, accumulator / h), flat);
      if (frame > 3) {
        const error = Math.abs(rendered.s - lastRendered.s - 80 * dt);
        maximumIncrementError = Math.max(maximumIncrementError, error);
        assert.ok(error < 1e-7, `Uneven motion at frame ${frame}: ${error} metres`);
      }
      lastRendered = rendered;
    }
    return { maximumIncrementError };
  });
}

for (const config of courses) check(`${config.name}: interpolation is continuous across every takeoff`, () => {
  const track = new Track(config), evidence = [];
  for (let jumpIndex = 0; jumpIndex < track.jumps.length; jumpIndex++) {
    const before = { ...initialState(), s: track.jumps[jumpIndex] - .1, speed: 80, jumpIndex };
    const current = { ...before };
    assert.ok(stepCar(current, { throttle: true }, h, track, { assist: true }).includes('jump'));
    const a = before.air + track.rampHeight(before.s), b = current.air + track.rampHeight(current.s);
    for (let i = 0; i <= 20; i++) {
      const alpha = i / 20, rendered = interpolateState(before, current, alpha, track);
      near(rendered.rideHeight, a + (b - a) * alpha, 1e-8, `Ramp ${jumpIndex}, alpha ${alpha}`);
      assert.ok(rendered.rideHeight >= Math.min(a, b) - 1e-8 && rendered.rideHeight <= Math.max(a, b) + 1e-8,
        'Takeoff interpolation must not create a vertical dip or double-count ramp height');
    }
    evidence.push({ jump: jumpIndex + 1, beforeHeight: a, afterHeight: b });
  }
  return evidence;
});

check('Interpolation takes the short heading path and clamps alpha', () => {
  const a = { ...initialState(), s: 100, heading: Math.PI - .05 }, b = { ...a, s: 101, heading: -Math.PI + .05 };
  near(interpolateState(a, b, .5, flat).heading, Math.PI);
  near(interpolateState(a, b, -1, flat).s, a.s);
  near(interpolateState(a, b, 2, flat).s, b.s);
});

function warningFixture(index = 0, x = -2, speed = 60) {
  const track = new Track(courses[index]), list = createEncounters(track, index), e = list[0];
  const warningDistance = Math.max(190, speed * 3.4);
  const previous = { ...initialState(), s: e.s - warningDistance - .25, speed, x };
  const car = { ...previous, s: previous.s + .5 };
  const events = stepEncounters(list, car, previous, h, track);
  assert.equal(events.filter(event => event.type === 'warning' && event.encounter === e).length, 1);
  return { track, list, e, car };
}

check('Encounter schedules escalate, remain on track, and use both named mascots', () => {
  const counts = [];
  for (let index = 0; index < courses.length; index++) {
    const track = new Track(courses[index]), a = createEncounters(track, index), b = createEncounters(track, index);
    assert.deepEqual(a, b, 'Schedule must be repeatable for time trials');
    counts.push(a.length);
    assert.equal(new Set(a.map(e => e.id)).size, a.length);
    assert.ok(a.every((e, i) => e.s > 0 && e.s < track.length && (i === 0 || e.s > a[i - 1].s)));
    assert.deepEqual(new Set(a.map(e => e.kind)), new Set(['riks', 'arkiv']));
    assert.ok(a.every(e => e.phase === 'waiting'));
  }
  assert.ok(counts[0] > 0 && counts[1] > counts[0] && counts[2] > counts[1]);
  assert.equal(encountersModule.mascotNames.riks, 'Riksrevisjonen');
  assert.equal(encountersModule.mascotNames.arkiv, 'Arkivverket');
  return { counts };
});

for (let index = 0; index < courses.length; index++) check(`${courses[index].name}: warning lane locks and warning emits once`, () => {
  for (const speed of [12, 60, 100]) {
    const { track, list, e, car } = warningFixture(index, -2, speed), lockedX = e.x;
    near(lockedX, -2);
    assert.ok((e.s - car.s) / speed >= 3, 'At least three seconds of warning at current speed');
    const changed = { ...car, x: 6, s: car.s + 1 };
    const events = stepEncounters(list, changed, car, h, track);
    near(e.x, lockedX, 0, 'Marked lane must not track the player after warning');
    assert.equal(events.filter(event => event.type === 'warning').length, 0);
    assert.ok(e.age > 0);
  }
});

check('Swept collision catches lane contact between ticks, then resolves exactly once', () => {
  const { track, list, e } = warningFixture(0, 0);
  // Both endpoints are clear, but the car crosses the marked lane at the drop.
  const a = { ...initialState(), s: e.s - 1, x: -5, speed: 80 };
  const b = { ...a, s: e.s + 1, x: 5 };
  const events = stepEncounters(list, b, a, h, track);
  assert.equal(events.filter(event => event.type === 'hit' && event.encounter === e).length, 1);
  assert.equal(e.phase, 'resolved');
  assert.equal(e.outcome, 'hit');
  for (let i = 0; i < 5; i++) assert.equal(stepEncounters(list, b, a, h, track).filter(event => event.encounter === e).length, 0);
});

check('Safe lane and high jump crossings award a dodge exactly once', () => {
  for (const clear of [{ x: 5, air: 0 }, { x: 0, air: 4 }]) {
    const { track, list, e } = warningFixture(0, 0);
    const a = { ...initialState(), ...clear, s: e.s - 1, speed: 80 }, b = { ...a, s: e.s + 1 };
    const events = stepEncounters(list, b, a, h, track);
    assert.equal(events.filter(event => event.type === 'dodge').length, 1);
    assert.equal(events.filter(event => event.type === 'hit').length, 0);
    assert.equal(stepEncounters(list, b, a, h, track).filter(event => event.encounter === e).length, 0);
  }
});

check('Collision evaluates the lane at the crossing, not the end of the tick', () => {
  const { track, list, e } = warningFixture(0, 0);
  // End position is under the parcel, but its earlier crossing was safely clear.
  const a = { ...initialState(), s: e.s - .1, x: 5, speed: 80 }, b = { ...a, s: e.s + 1.9, x: 0 };
  assert.equal(stepEncounters(list, b, a, h, track).find(event => event.encounter === e)?.type, 'dodge');
});

check('Checkpoint recovery and forward teleports never cause parcel collisions', () => {
  for (const direction of [-1, 1]) {
    const { track, list, e } = warningFixture(0, 0);
    const a = { ...initialState(), s: e.s - direction * 20, x: 0, speed: 80 }, b = { ...a, s: e.s + direction * 20 };
    assert.equal(stepEncounters(list, b, a, h, track).length, 0);
    assert.equal(e.phase, 'warning');
  }
});

check('All encounters can be resolved in a bounded forward drive', () => {
  const outcomes = [];
  for (let index = 0; index < courses.length; index++) {
    const track = new Track(courses[index]), list = createEncounters(track, index), events = [];
    let car = { ...initialState(), speed: 80 };
    for (let frame = 0; car.s < track.length && frame < 120 * 100; frame++) {
      const previous = { ...car }; car.s = Math.min(track.length, car.s + car.speed * h);
      events.push(...stepEncounters(list, car, previous, h, track));
    }
    assert.equal(events.filter(event => event.type === 'warning').length, list.length);
    assert.equal(events.filter(event => event.type === 'hit').length, list.length);
    assert.ok(list.every(e => e.phase === 'resolved'));
    outcomes.push({ course: courses[index].id, warnings: list.length, hits: list.length });
  }
  return outcomes;
});

check('New career unlocks only the first course and advances on completion', () => {
  const p = loadProgress();
  assert.deepEqual([0, 1, 2].map(i => !!unlocked(p, i)), [true, false, false]);
  assert.equal(rank(p), 'Arkivlærling');
  assert.equal(completeStage(p, 0, 3, [], 0), true, 'Finishing unlocks next course even before earning a medal');
  assert.deepEqual([0, 1, 2].map(i => !!unlocked(p, i)), [true, true, false]);
  assert.equal(rank(p), 'Dokumentjeger');
  assert.equal(completeStage(p, 0, 3, [], 0), false, 'Repeat finish does not repeat unlock notification');
  completeStage(p, 1, 2, [], 0);
  assert.equal(unlocked(p, 2), true);
  completeStage(p, 2, 2, [], 0);
  assert.equal(rank(p), 'Fjellarkivar');
});

check('Existing records migrate completion without blocking previously raced courses', () => {
  for (let index = 0; index < courses.length; index++) {
    const p = loadProgress({}, { [`${courses[index].id}-archive0-assist`]: { time: 90 } });
    assert.equal(p.completed[index], true);
    assert.equal(!!unlocked(p, index), true, `Existing ${courses[index].name} record should remain accessible`);
  }
});

check('Stars only improve; mastery counts unique correct mascot questions', () => {
  const p = loadProgress(), q = { id: 'hard-one', mascot: 'riks', correct: 1 };
  const answers = [
    { q, choice: 1 }, { q, choice: 1 },
    { q: { id: 'hard-wrong', mascot: 'arkiv', correct: 2 }, choice: 0 },
    { q: { id: 'hard-skipped', mascot: 'arkiv', correct: 2 }, choice: null },
    { q: { id: 'routine', correct: 0 }, choice: 0 }
  ];
  completeStage(p, 0, 0, answers, 2);
  completeStage(p, 0, 3, answers, 1);
  assert.equal(p.stars[0], 3, 'Slower repeats must preserve best star result');
  assert.deepEqual(p.mastered, ['hard-one']);
  assert.equal(p.dodges, 3);
  completeStage(p, 1, 1, [], 0); assert.equal(p.stars[1], 2);
  completeStage(p, 2, 2, [], 0); assert.equal(p.stars[2], 1);
});

check('Mastery rank requires nine stars and twelve distinct difficult answers', () => {
  const p = loadProgress();
  for (let index = 0; index < 3; index++) completeStage(p, index, 0, [], 0);
  const answers = Array.from({ length: 12 }, (_, i) => ({ q: { id: `hard-${i}`, mascot: i % 2 ? 'arkiv' : 'riks', correct: 0 }, choice: 0 }));
  completeStage(p, 2, 0, answers.slice(0, 11), 0);
  assert.equal(rank(p), 'Fjellarkivar');
  completeStage(p, 2, 0, answers, 0);
  assert.equal(rank(p), 'Riksarkivar på hjul');
  completeStage(p, 2, 0, answers, 0);
  assert.equal(p.mastered.length, 12);
});

check('Saved career data is normalized and mastery duplicates removed', () => {
  const p = loadProgress({ completed: [1], stars: [99, -4, '2'], mastered: ['a', 'a', null, 4, 'b'], dodges: -5 });
  assert.deepEqual(p.completed, [true, false, false]);
  assert.deepEqual(p.stars, [3, 0, 2]);
  assert.deepEqual(p.mastered, ['a', 'b']);
  assert.equal(p.dodges, 0);
});

check('Turbo accelerates with an empty manual-boost tank', () => {
  const normal = { ...initialState(), s: 100, speed: 50, boost: 0 }, turbo = { ...normal, turbo: 2 };
  for (let i = 0; i < 60; i++) {
    stepCar(normal, { throttle: true }, h, flat, { assist: true });
    stepCar(turbo, { throttle: true }, h, flat, { assist: true });
  }
  assert.ok(turbo.speed > normal.speed + 10, 'Correct-answer turbo must give material acceleration without fuel');
  assert.equal(turbo.boost, 0);
  assert.equal(turbo.boosting, true);
  near(turbo.turbo, 1.5, 1e-7);
  return { normalSpeed: normal.speed, turboSpeed: turbo.speed, manualFuel: turbo.boost };
});

check('Turbo never consumes manual fuel even while Boost is held', () => {
  const car = { ...initialState(), s: 100, speed: 60, boost: 40, turbo: 2 };
  for (let i = 0; i < 60; i++) stepCar(car, { throttle: true, boost: true }, h, flat, { assist: true });
  near(car.boost, 40);
  assert.ok(car.turbo > 0);
  car.turbo = 0;
  stepCar(car, { throttle: true, boost: true }, h, flat, { assist: true });
  assert.ok(car.boost < 40, 'Manual boost resumes consuming fuel after turbo finishes');
});

check('Turbo can exceed normal top speed and expires without snapping speed down', () => {
  const car = { ...initialState(), s: 100, speed: 95, boost: 0, turbo: 2 };
  for (let i = 0; i < 120; i++) stepCar(car, { throttle: true }, h, flat, { assist: true });
  assert.ok(car.speed > 100 && car.speed <= 112);
  car.turbo = h / 2;
  const before = car.speed;
  stepCar(car, { throttle: true }, h, flat, { assist: true });
  assert.equal(car.turbo, 0);
  assert.equal(car.boosting, false);
  assert.ok(car.speed > before - 1, 'Ending turbo must preserve physical momentum');
});

check('Stagger limits acceleration, expires, and restores full acceleration', () => {
  const normal = { ...initialState(), s: 100, speed: 35, boost: 0 }, stagger = { ...normal, stagger: .5 };
  for (let i = 0; i < 30; i++) {
    stepCar(normal, { throttle: true }, h, flat, { assist: true });
    stepCar(stagger, { throttle: true }, h, flat, { assist: true });
  }
  assert.ok(stagger.speed < normal.speed - 1, 'Penalty must make regaining speed meaningfully slower');
  assert.ok(stagger.stagger > 0);
  for (let i = 0; i < 40; i++) stepCar(stagger, { throttle: true }, h, flat, { assist: true });
  assert.equal(stagger.stagger, 0);
  const restored = { ...stagger }, clean = { ...stagger, stagger: 0 };
  stepCar(restored, { throttle: true }, h, flat, { assist: true });
  stepCar(clean, { throttle: true }, h, flat, { assist: true });
  near(restored.speed, clean.speed);
  assert.equal(initialState().turbo, 0); assert.equal(initialState().stagger, 0);
});

check('Checkpoint recovery clears turbo and stagger', () => {
  const car = { ...initialState(), s: 500, speed: 110, turbo: 3, stagger: 1, checkpointS: 100, checkpoint: 1 };
  recoverCar(car, flat);
  assert.equal(car.turbo, 0); assert.equal(car.stagger, 0); assert.equal(car.boosting, false);
  assert.equal(car.s, 100); assert.equal(car.time, 3); assert.equal(car.crashes, 1);
});

console.log(JSON.stringify({ status: report.every(test => test.pass) ? 'PASS' : 'FAIL', checks: report.length, tests: report }, null, 2));
process.exitCode = report.every(test => test.pass) ? 0 : 1;
